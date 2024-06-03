import {
  collection,
  query,
  orderBy,
  startAfter,
  limit,
  getDocs,
  Query,
  DocumentData,
  doc,
  getDoc,
  getCountFromServer,
  where,
  startAt,
  endAt,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  FavouriteDomain,
  NAME_OFFERS_ID,
  reverseLookupBatch,
  reverseLookup,
  getAllDomains,
  getFavoriteDomain,
} from "@bonfida/spl-name-service";
import { Connection, PublicKey } from "@solana/web3.js";
import { firebaseApi } from ".";

type LeaderboardRow = {
  id: string;
  owner: string;
  domain: string;
  rank: number;
  total_activity_deposit_points: number;
  total_activity_borrow_points: number;
  total_referral_deposit_points: number;
  total_referral_borrow_points: number;
  total_deposit_points: number;
  total_borrow_points: number;
  total_referral_points: number;
  socialPoints: number;
  total_points: number;
};

type LeaderboardSettings = {
  pageSize: number;
  currentPage: number;
  orderCol: string;
  orderDir: "desc" | "asc";
  pageDirection?: "next" | "prev";
  search?: string;
};

let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined;
let lastOrderCol: string | undefined;
let lastOrderDir: "desc" | "asc" | undefined;
let prevPages: LeaderboardRow[][] = [];
let lastSearch: string | undefined;

async function fetchLeaderboardData(connection: Connection, settings: LeaderboardSettings): Promise<LeaderboardRow[]> {
  if (settings.pageDirection === "prev" && settings.currentPage > 1) {
    if (prevPages.length > 1) {
      prevPages.pop();
      return prevPages[prevPages.length - 1];
    }
  }

  if (settings.pageDirection === "prev" && settings.currentPage === 1) {
    const rtn = prevPages[0];
    prevPages = [];

    return rtn;
  }

  console.log(settings);

  if (
    lastOrderCol !== settings.orderCol ||
    (lastOrderDir !== settings.orderDir && settings.pageDirection !== "prev") ||
    (settings.search && settings.search.length && lastSearch !== settings.search)
  ) {
    lastVisible = undefined;
    lastOrderCol = settings.orderCol;
    lastOrderDir = settings.orderDir;
    prevPages = [];
  }

  const searchNum = Number(settings.search || "");
  let searchQ = [where("owner", "==", settings.search)];

  if (settings.search && !isNaN(searchNum)) {
    searchQ = [where("rank", "==", searchNum + 1)];
  }

  const pointsQuery = query(
    collection(firebaseApi.db, "points"),
    ...(settings.search
      ? searchQ
      : [
          where(settings.orderCol, ">=", 1),
          orderBy(settings.orderCol, settings.orderDir),
          ...(lastVisible ? [startAfter(lastVisible)] : []),
          limit(settings.pageSize),
        ])
  );
  const querySnapshot = await getDocs(pointsQuery);

  if (!settings.search) {
    lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  }

  const leaderboardSlice = querySnapshot.docs
    .map((doc) => ({
      ...(doc.data() as LeaderboardRow),
      rank: doc.data().rank - 1,
    }))
    .filter((item) => item.owner !== null && item.owner !== undefined && item.owner != "None");

  const leaderboardFinalSlice: LeaderboardRow[] = [...leaderboardSlice];

  prevPages.push(leaderboardSlice);

  // batch fetch all favorite domains and update array
  const publicKeys = leaderboardFinalSlice
    .map((value) => {
      if (!value.owner) return null;
      const [favoriteDomains] = FavouriteDomain.getKeySync(NAME_OFFERS_ID, new PublicKey(value.owner));
      return favoriteDomains;
    })
    .filter((value) => value !== null) as PublicKey[];

  const favoriteDomainsInfo = (await connection.getMultipleAccountsInfo(publicKeys)).map((accountInfo, idx) =>
    accountInfo ? FavouriteDomain.deserialize(accountInfo.data).nameAccount : publicKeys[idx]
  );
  const reverseLookup = await reverseLookupBatch(connection, favoriteDomainsInfo);

  leaderboardFinalSlice.map((value, idx) => {
    const domain = reverseLookup[idx];
    if (domain) {
      value.domain = `${domain}.sol`;
    }

    return value;
  });
  return leaderboardSlice;
}

async function fetchTotalLeaderboardCount() {
  const q = query(collection(firebaseApi.db, "points"), where("total_points", ">=", 1));
  const qCount = await getCountFromServer(q);
  const count = qCount.data().count;
  return count;
}

/*
async function fetchLeaderboardDataOld({
  connection,
  queryCursor,
  pageSize = 50,
  orderCol = "total_points",
  orderDir = "desc",
}: {
  connection?: Connection;
  queryCursor?: QueryDocumentSnapshot<DocumentData>;
  pageSize?: number;
  orderCol?: string;
  orderDir?: "desc" | "asc";
}): Promise<LeaderboardRow[]> {
  const pointsCollection = collection(firebaseApi.db, "points");

  const pointsQuery: Query<DocumentData> = query(
    pointsCollection,
    orderBy(orderCol, orderDir),
    ...(queryCursor ? [startAfter(queryCursor)] : []),
    limit(pageSize)
  );

  const querySnapshot = await getDocs(pointsQuery);
  const leaderboardSlice = querySnapshot.docs
    .filter((item) => item.id !== null && item.id !== undefined && item.id != "None")
    .map((doc) => {
      const data = { id: doc.id, doc, ...doc.data() } as LeaderboardRow;
      return data;
    });

  const leaderboardFinalSlice: LeaderboardRow[] = [...leaderboardSlice];

  if (!connection) {
    return leaderboardFinalSlice;
  }

  // batch fetch all favorite domains and update array
  const publicKeys = leaderboardFinalSlice.map((value) => {
    const [favoriteDomains] = FavouriteDomain.getKeySync(NAME_OFFERS_ID, new PublicKey(value.id));
    return favoriteDomains;
  });
  const favoriteDomainsInfo = (await connection.getMultipleAccountsInfo(publicKeys)).map((accountInfo, idx) =>
    accountInfo ? FavouriteDomain.deserialize(accountInfo.data).nameAccount : publicKeys[idx]
  );
  const reverseLookup = await reverseLookupBatch(connection, favoriteDomainsInfo);

  leaderboardFinalSlice.map((value, idx) => {
    const domain = reverseLookup[idx];
    if (domain) {
      value.domain = `${domain}.sol`;
    }

    return value;
  });

  return leaderboardFinalSlice;
}*/

// Firebase query is very constrained, so we calculate the number of users with more points
// as the the count of users with more points inclusive of corrupted rows - the count of corrupted rows
async function fetchUserRank(address: string): Promise<number> {
  const q = query(collection(firebaseApi.db, "points"), where("owner", "==", address));

  const data = await getDocs(q);

  if (!data.docs.length) {
    return 0;
  }

  return data.docs[0].data().rank - 1;
}

async function fetchTotalUserCount() {
  const q1 = query(collection(firebaseApi.db, "points"));
  const q2 = query(collection(firebaseApi.db, "points"), where("owner", "==", null));
  const q1Count = await getCountFromServer(q1);
  const q2Count = await getCountFromServer(q2);
  return q1Count.data().count - q2Count.data().count;
}

interface UserPointsData {
  owner: string;
  depositPoints: number;
  borrowPoints: number;
  referralPoints: number;
  referralLink: string;
  isCustomReferralLink: boolean;
  userRank: number | null;
  totalPoints: number;
}

const DEFAULT_USER_POINTS_DATA: UserPointsData = {
  owner: "",
  depositPoints: 0,
  borrowPoints: 0,
  referralPoints: 0,
  referralLink: "",
  isCustomReferralLink: false,
  userRank: null,
  totalPoints: 0,
};

const getPointsDataForUser = async (wallet: string | undefined): Promise<UserPointsData> => {
  if (!wallet) return DEFAULT_USER_POINTS_DATA;

  const userPointsDoc = doc(firebaseApi.db, "points", wallet);
  const userPublicProfileDoc = doc(firebaseApi.db, "users_public", wallet);

  let userPointsSnap;
  let userPublicProfileSnap;
  let userReferralData;
  let userReferralCode = "";
  let isCustomReferralLink = false;

  try {
    userPointsSnap = await getDoc(userPointsDoc);
  } catch (e) {
    return {
      ...DEFAULT_USER_POINTS_DATA,
      owner: wallet,
    };
  }

  try {
    userPublicProfileSnap = await getDoc(userPublicProfileDoc);
    userReferralData = userPublicProfileSnap.data();
    if (userReferralData && Array.isArray(userReferralData?.referralCode)) {
      const uuidPattern = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-\b[0-9a-fA-F]{12}$/;
      userReferralCode = userReferralData.referralCode.find((code) => !uuidPattern.test(code));
      isCustomReferralLink = true;
    } else {
      userReferralCode = userReferralData?.referralCode || "";
      isCustomReferralLink = false;
    }
  } catch (e) {
    console.log("error", e);
  }

  const pointsData = userPointsSnap.data();

  if (!pointsData) {
    return {
      ...DEFAULT_USER_POINTS_DATA,
      referralLink: userReferralCode,
      owner: wallet,
    };
  }

  const depositPoints = pointsData.total_activity_deposit_points.toFixed(4);
  const borrowPoints = pointsData.total_activity_borrow_points.toFixed(4);
  const referralPoints = (pointsData.total_referral_deposit_points + pointsData.total_referral_borrow_points).toFixed(
    4
  );
  const totalPoints =
    pointsData.total_activity_deposit_points +
    pointsData.total_activity_borrow_points +
    (pointsData.total_referral_deposit_points + pointsData.total_referral_borrow_points) +
    (pointsData.socialPoints ? pointsData.socialPoints : 0);

  return {
    owner: pointsData.owner,
    depositPoints,
    borrowPoints,
    referralPoints,
    referralLink: userReferralCode,
    isCustomReferralLink,
    userRank: pointsData.rank - 1,
    totalPoints,
  };
};

async function getPointsSummary() {
  const pointsSummaryCollection = collection(firebaseApi.db, "points_summary");
  const pointSummarySnapshot = await getDocs(pointsSummaryCollection);
  const pointSummary = pointSummarySnapshot.docs[0]?.data() ?? { points_total: 0 };
  return pointSummary;
}

export {
  fetchLeaderboardData,
  fetchTotalLeaderboardCount,
  fetchUserRank,
  fetchTotalUserCount,
  getPointsSummary,
  getPointsDataForUser,
  DEFAULT_USER_POINTS_DATA,
};

export type { LeaderboardRow, LeaderboardSettings, UserPointsData };
