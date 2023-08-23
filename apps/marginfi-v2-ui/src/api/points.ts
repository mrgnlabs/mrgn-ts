import {
  collection,
  query,
  orderBy,
  startAfter,
  limit,
  getDocs,
  Query,
  DocumentData,
  where,
  getCountFromServer,
  doc,
  getDoc,
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
  const querySnapshot1 = await getCountFromServer(q1);
  const nullGreaterDocsCount = querySnapshot1.data().count;

  const q2 = query(
    collection(firebaseDb, "points"),
    where("total_points", ">", userPoints),
    orderBy("total_points", "desc")
  );
  const querySnapshot2 = await getCountFromServer(q2);
  const allGreaterDocsCount = querySnapshot2.data().count;

  return allGreaterDocsCount - nullGreaterDocsCount;
}

const getPoints = async ({ wallet }: { wallet: string | undefined }) => {
  if (!wallet) return;

  const docRef = doc(firebaseDb, "points", wallet);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const pointsData = docSnap.data();
    const points = {
      owner: pointsData.owner,
      deposit_points: pointsData.total_deposit_points.toFixed(4),
      borrow_points: pointsData.total_borrow_points.toFixed(4),
      total:
        pointsData.total_deposit_points +
        pointsData.total_borrow_points +
        (pointsData.socialPoints ? pointsData.socialPoints : 0),
    };
    return points;
  } else {
    return {
      owner: wallet,
      deposit_points: 0,
      borrow_points: 0,
      total: 0,
    };
  }
};

export { fetchLeaderboardData, fetchUserRank, getPoints };

export type { LeaderboardRow };
