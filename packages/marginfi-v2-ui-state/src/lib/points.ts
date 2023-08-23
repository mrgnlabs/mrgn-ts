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
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

type LeaderboardRow = {
  id: string;
  total_activity_deposit_points: number;
  total_activity_borrow_points: number;
  total_referral_deposit_points: number;
  total_referral_borrow_points: number;
  total_deposit_points: number;
  total_borrow_points: number;
  socialPoints: number;
};

async function fetchLeaderboardData(rowCap = 100, pageSize = 50): Promise<LeaderboardRow[]> {
  const pointsCollection = collection(firebaseDb, "points");

  const leaderboardMap = new Map();
  let initialQueryCursor = null;
  do {
    let pointsQuery: Query<DocumentData>;
    if (initialQueryCursor) {
      pointsQuery = query(
        pointsCollection,
        orderBy("total_points", "desc"),
        startAfter(initialQueryCursor),
        limit(pageSize)
      );
    } else {
      pointsQuery = query(pointsCollection, orderBy("total_points", "desc"), limit(pageSize));
    }

    const querySnapshot = await getDocs(pointsQuery);
    const leaderboardSlice = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const leaderboardSliceFiltered = leaderboardSlice.filter(
      (item) => item.id !== null && item.id !== undefined && item.id != "None"
    );

    for (const row of leaderboardSliceFiltered) {
      leaderboardMap.set(row.id, row);
    }

    initialQueryCursor = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
  } while (initialQueryCursor !== null && leaderboardMap.size < rowCap);

  return [...leaderboardMap.values()].slice(0, 100);
}

// Firebase query is very constrained, so we calculate the number of users with more points
// as the the count of users with more points inclusive of corrupted rows - the count of corrupted rows
async function fetchUserRank(userPoints: number): Promise<number> {
  const q1 = query(
    collection(firebaseDb, "points"),
    where("owner", "==", null),
    where("total_points", ">", userPoints),
    orderBy("total_points", "desc")
  );
  const q2 = query(
    collection(firebaseDb, "points"),
    where("total_points", ">", userPoints),
    orderBy("total_points", "desc")
  );

  const [querySnapshot1, querySnapshot2] = await Promise.all([getCountFromServer(q1), getCountFromServer(q2)]);

  const nullGreaterDocsCount = querySnapshot1.data().count;
  const allGreaterDocsCount = querySnapshot2.data().count;

  return allGreaterDocsCount - nullGreaterDocsCount;
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

  const userPointsDoc = doc(firebaseDb, "points", wallet);
  const userPublicProfileDoc = doc(firebaseDb, "users_public", wallet);

  const [userPointsSnap, userPublicProfileSnap] = await Promise.all([
    getDoc(userPointsDoc),
    getDoc(userPublicProfileDoc),
  ]);

  if (!userPointsSnap.exists() || !userPublicProfileSnap.exists()) {
    return {
      ...DEFAULT_USER_POINTS_DATA,
      owner: wallet,
    };
  }

  const userReferralData = userPublicProfileSnap.data();
  let userReferralCode = "";
  let isCustomReferralLink;
  if (userReferralData && Array.isArray(userReferralData?.referralCode)) {
    const uuidPattern = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-\b[0-9a-fA-F]{12}$/;
    userReferralCode = userReferralData.referralCode.find((code) => !uuidPattern.test(code));
    isCustomReferralLink = true;
  } else {
    userReferralCode = userReferralData?.referralCode || "";
    isCustomReferralLink = false;
  }

  const pointsData = userPointsSnap.data();

  const depositPoints = pointsData.total_deposit_points.toFixed(4);
  const borrowPoints = pointsData.total_borrow_points.toFixed(4);
  const referralPoints = (pointsData.total_referral_deposit_points + pointsData.total_referral_borrow_points).toFixed(
    4
  );
  const totalPoints =
    pointsData.total_deposit_points +
    pointsData.total_borrow_points +
    (pointsData.socialPoints ? pointsData.socialPoints : 0);

  const userRank = await fetchUserRank(totalPoints);

  return {
    owner: pointsData.owner,
    depositPoints,
    borrowPoints,
    referralPoints,
    referralLink: pointsData.referral_link,
    isCustomReferralLink,
    userRank,
    totalPoints,
  };
};

async function getPointsSummary() {
  const pointsSummaryCollection = collection(firebaseDb, "points_summary");
  const pointSummarySnapshot = await getDocs(pointsSummaryCollection);
  const pointSummary = pointSummarySnapshot.docs[0]?.data() ?? { points_total: 0 };
  return pointSummary;
}

export { fetchLeaderboardData, fetchUserRank, getPointsSummary, getPointsDataForUser, DEFAULT_USER_POINTS_DATA };

export type { LeaderboardRow, UserPointsData };
