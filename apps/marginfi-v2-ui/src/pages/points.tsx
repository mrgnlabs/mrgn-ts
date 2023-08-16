import { Fragment, useCallback, useMemo } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Card,
  CardContent,
  Skeleton,
  TextField,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState } from "react";
import { PageHeader } from "~/components/PageHeader";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { numeralFormatter, groupedNumberFormatterDyn } from "~/utils/formatters";
import Link from "next/link";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import Image from "next/image";
import { firebaseDb } from "~/api/firebase";
import { useFirebaseAccount } from "~/context/FirebaseAccount";
import { useRouter } from "next/router";
import { firebaseApi } from "~/api";
import { WalletButton } from "~/components/Navbar/WalletButton";
import { grey } from "@mui/material/colors";
import { toast } from "react-toastify";
import { LeaderboardRow, fetchLeaderboardData, fetchUserRank } from "~/api/points";

type UserData = {
  userTotalPoints?: number;
  userLendingPoints?: number;
  userBorrowingPoints?: number;
  userReferralPoints?: number;
  userReferralLink?: string;
  userRank?: number;
};

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }: { theme: any }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

const Points: FC = () => {
  const wallet = useWallet();
  const { query: routerQuery } = useRouter();
  const { currentUser, existingUser, initialUserFetchDone } = useFirebaseAccount();

  const [userData, setUserData] = useState<UserData>();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>([]);
  const [usingCustomReferralCode, setUsingCustomReferralCode] = useState(false);

  const currentUserId = useMemo(() => currentUser?.uid, [currentUser]);
  const referralCode = useMemo(() => routerQuery.referralCode as string | undefined, [routerQuery.referralCode]);

  useEffect(() => {
    fetchLeaderboardData().then(setLeaderboardData); // TODO: cache leaderboard and avoid call
  }, [wallet.connected, wallet.publicKey]); // Dependency array to re-fetch when these variables change

  useEffect(() => {
    const fetchuserData = async () => {
      // Fetch user data
      if (currentUserId && leaderboardData.length > 0) {
        // get user referral code
        const userDoc = await getDoc(doc(firebaseDb, "users_public", currentUserId));
        const userReferralData = userDoc.data();

        let userReferralCode = "";
        if (userReferralData && Array.isArray(userReferralData?.referralCode)) {
          const uuidPattern = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-\b[0-9a-fA-F]{12}$/;
          userReferralCode = userReferralData.referralCode.find((code) => !uuidPattern.test(code));
          setUsingCustomReferralCode(true);
        } else {
          userReferralCode = userReferralData?.referralCode || "";
          setUsingCustomReferralCode(false);
        }

        // get user points
        const userPointsDoc = await getDoc(doc(firebaseDb, "points", currentUserId));
        const userPointsData = userPointsDoc.data();

        const userTotalPoints =
          userPointsData?.total_deposit_points +
          userPointsData?.total_borrow_points +
          (userPointsData?.socialPoints ? userPointsData?.socialPoints : 0);
        const userLendingPoints = userPointsData?.total_activity_deposit_points;
        const userBorrowingPoints = userPointsData?.total_activity_borrow_points;
        const userReferralPoints =
          userPointsData?.total_referral_deposit_points + userPointsData?.total_referral_borrow_points;

        const userRank = await fetchUserRank(userPointsData?.total_points ?? 0);

        setUserData({
          userTotalPoints,
          userLendingPoints,
          userBorrowingPoints,
          userReferralPoints,
          userReferralLink: userReferralCode ? `https://mfi.gg/r/${userReferralCode}` : "",
          userRank,
        });
      }
    };

    fetchuserData().catch((e) => console.log(e));
  }, [currentUserId, leaderboardData, setUsingCustomReferralCode, wallet.publicKey]);

  return (
    <>
      <PageHeader text="points" />
      <div className="flex flex-col items-center w-full sm:w-4/5 max-w-7xl gap-5 py-[64px] sm:py-[32px]">
        {!wallet.connected ? (
          <ConnectWallet />
        ) : currentUser ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-2/3">
              <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
                <CardContent>
                  <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                    Total Points
                    <div className="self-center">
                      <HtmlTooltip
                        title={
                          <Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              Points
                            </Typography>
                            Points refresh every 24 hours.
                          </Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </Typography>
                  <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                    {userData?.userTotalPoints && userData.userTotalPoints > 0 ? (
                      numeralFormatter(userData.userTotalPoints)
                    ) : (
                      <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                    )}
                  </Typography>
                </CardContent>
              </Card>
              <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
                <CardContent>
                  <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                    Global Rank {/* TODO: fix that with dedicated query */}
                  </Typography>
                  <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                    {userData?.userRank && userData?.userRank > 0 ? (
                      `#${groupedNumberFormatterDyn.format(userData?.userRank)}`
                    ) : (
                      <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-2/3">
              <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
                <CardContent>
                  <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                    Lending Points
                    <div className="self-center">
                      <HtmlTooltip
                        title={
                          <Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              Lending
                            </Typography>
                            Lending earns 1 point per dollar lent per day.
                          </Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </Typography>
                  <Typography color="#fff" component="div" className="font-aeonik font-[500] text-2xl">
                    {userData?.userLendingPoints && userData?.userLendingPoints > 0 ? (
                      numeralFormatter(userData?.userLendingPoints)
                    ) : (
                      <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                    )}
                  </Typography>
                </CardContent>
              </Card>
              <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
                <CardContent>
                  <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                    Borrowing Points
                    <div className="self-center">
                      <HtmlTooltip
                        title={
                          <Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              Borrowing
                            </Typography>
                            Borrowing earns 4 points per dollar borrowed per day.
                          </Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </Typography>
                  <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                    {userData?.userBorrowingPoints && userData?.userBorrowingPoints > 0 ? (
                      numeralFormatter(userData?.userBorrowingPoints)
                    ) : (
                      <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                    )}
                  </Typography>
                </CardContent>
              </Card>
              <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
                <CardContent>
                  <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                    Referral Points
                    <div className="self-center">
                      <HtmlTooltip
                        title={
                          <Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              Earn more with friends
                            </Typography>
                            Earn 10% of the points any user you refer earns.
                          </Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </Typography>
                  <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                    {userData?.userReferralPoints && userData?.userReferralPoints > 0 ? (
                      numeralFormatter(userData?.userReferralPoints)
                    ) : userData?.userReferralPoints === 0 ? (
                      "-"
                    ) : (
                      <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </>
        ) : !initialUserFetchDone ? (
          <CheckingUser />
        ) : existingUser ? (
          <Login />
        ) : (
          <Signup referralCode={referralCode} />
        )}
        <div className="w-2/3 flex justify-center items-center gap-5">
          <Button
            className="normal-case text-lg font-aeonik w-[92%] min-h-[60px] rounded-[45px] whitespace-nowrap min-w-[260px] max-w-[260px]"
            style={{
              backgroundColor: "rgb(227, 227, 227)",
              border: "none",
              color: "black",
              zIndex: 10,
            }}
            component="a"
            href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
            target="_blank"
            rel="noopener noreferrer"
          >
            How do points work?
          </Button>
          {currentUser && (
            <Button
              className={`normal-case text-lg font-aeonik w-[92%] min-h-[60px] rounded-[45px] gap-2 whitespace-nowrap min-w-[260px] max-w-[260px]`}
              style={{
                backgroundImage: usingCustomReferralCode
                  ? "radial-gradient(ellipse at center, #fff 0%, #fff 10%, #DCE85D 60%, #DCE85D 100%)"
                  : "none",
                backgroundColor: usingCustomReferralCode ? "transparent" : "rgb(227, 227, 227)",

                border: "none",
                color: "black",
                zIndex: 10,
              }}
              onClick={() => {
                if (userData?.userReferralLink) {
                  navigator.clipboard.writeText(userData.userReferralLink);
                }
              }}
            >
              {`${
                usingCustomReferralCode ? userData?.userReferralLink?.replace("https://", "") : "Copy referral link"
              }`}
              <FileCopyIcon />
            </Button>
          )}
        </div>
        <div className="w-4/5 text-center text-[#868E95] text-xs flex justify-center gap-1">
          <div>We reserve the right to update point calculations at any time.</div>
          <div>
            <Link href="/terms/points" style={{ textDecoration: "underline" }}>
              Terms.
            </Link>
          </div>
        </div>

        <TableContainer component={Paper} className="h-full w-4/5 sm:w-full bg-[#131619] rounded-xl overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  className="text-white text-base font-aeonik border-none pl-2"
                  style={{ fontWeight: 500 }}
                >
                  Rank
                </TableCell>
                <TableCell className="text-white text-base font-aeonik border-none" style={{ fontWeight: 500 }}>
                  User
                </TableCell>
                <TableCell
                  className="text-white text-base font-aeonik border-none"
                  align="right"
                  style={{ fontWeight: 500 }}
                >
                  Lending Points
                </TableCell>
                <TableCell
                  className="text-white text-base font-aeonik border-none"
                  align="right"
                  style={{ fontWeight: 500 }}
                >
                  Borrowing Points
                </TableCell>
                <TableCell
                  className="text-white text-base font-aeonik border-none"
                  align="right"
                  style={{ fontWeight: 500 }}
                >
                  Referral Points
                </TableCell>
                <TableCell
                  className="text-white text-base font-aeonik border-none"
                  align="right"
                  style={{ fontWeight: 500 }}
                >
                  Social Points
                </TableCell>
                <TableCell
                  className="text-white text-base font-aeonik border-none"
                  align="right"
                  style={{ fontWeight: 500 }}
                >
                  Total Points
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboardData.map((row: LeaderboardRow, index: number) => (
                <TableRow key={row.id} className={`${row.id === currentUserId ? "glow" : ""}`}>
                  <TableCell
                    align="center"
                    className={`${index <= 2 ? "text-2xl" : "text-base"} border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                  >
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </TableCell>
                  <TableCell
                    className={`text-base border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                    style={{ fontWeight: 400 }}
                  >
                    <a
                      href={`https://solscan.io/account/${row.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                      className="glow-on-hover"
                    >
                      {`${row.id.slice(0, 5)}...${row.id.slice(-5)}`}
                      <style jsx>{`
                        a:hover {
                          text-decoration: underline;
                        }
                      `}</style>
                    </a>
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`text-base border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                    style={{ fontWeight: 400 }}
                  >
                    {groupedNumberFormatterDyn.format(Math.round(row.total_activity_deposit_points))}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`text-base border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                    style={{ fontWeight: 400 }}
                  >
                    {groupedNumberFormatterDyn.format(Math.round(row.total_activity_borrow_points))}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`text-base border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                    style={{ fontWeight: 400 }}
                  >
                    {groupedNumberFormatterDyn.format(
                      Math.round(row.total_referral_deposit_points + row.total_referral_borrow_points)
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`text-base border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                    style={{ fontWeight: 400 }}
                  >
                    {groupedNumberFormatterDyn.format(Math.round(row.socialPoints ? row.socialPoints : 0))}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`text-base border-none font-aeonik ${
                      row.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    }`}
                    style={{ fontWeight: 400 }}
                  >
                    {groupedNumberFormatterDyn.format(
                      Math.round(
                        row.total_deposit_points + row.total_borrow_points + (row.socialPoints ? row.socialPoints : 0)
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
};

const ConnectWallet: FC = () => (
  <Card className="w-2/3 bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
    <CardContent>
      <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
        <div>
          <span className="text-2xl font-[500]">Access upgraded features</span>
          <br />
          <br />
        </div>
        <div className="w-full flex justify-center items-center">
          <WalletButton />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CheckingUser: FC = () => (
  <Card className="w-2/3 bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
    <CardContent>
      <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
        <div>
          <span className="text-2xl font-[500]">Access upgraded features</span>
          <br />
          <br />
        </div>
        <div className="flex gap-3 justify-center items-center">
          <div className="w-full flex justify-center items-center">Retrieving data</div>
          <CircularProgress size="20px" sx={{ color: "#e1e1e1" }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const Signup: FC<{ referralCode?: string }> = ({ referralCode }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [manualCode, setManualCode] = useState("");
  const [useAuthTx, setUseAuthTx] = useState(false);
  const [useManualCode, setUseManualCode] = useState(false);

  const finalReferralCode = useMemo(
    () => (useManualCode ? manualCode : referralCode),
    [useManualCode, manualCode, referralCode]
  );

  useEffect(() => {
    if (manualCode.length > 0) {
      setUseManualCode((current) => current || true);
    }
  }, [manualCode]);

  const signup = useCallback(async () => {
    toast.info("Logging in...");
    const blockhashInfo = await connection.getLatestBlockhash();
    try {
      await firebaseApi.signup(wallet, useAuthTx ? "tx" : "memo", blockhashInfo, finalReferralCode);
      // localStorage.setItem("authData", JSON.stringify(signedAuthData));
      toast.success("Signed up successfully");
    } catch (signupError: any) {
      toast.error(signupError.message);
    }
  }, [connection, finalReferralCode, useAuthTx, wallet]);

  return (
    <Card className="w-2/3 bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
      <CardContent>
        <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
          <div>
            <span className="text-2xl font-[500]">Access upgraded features</span>
            <br />
            <br />
            Prove you own this wallet by signing a message.
            <br />
            Optionally enter a referral code below.
          </div>
          <div className="w-full flex justify-center items-center">
            {wallet.connected ? (
              <div>
                <TextField
                  size="medium"
                  variant="outlined"
                  value={finalReferralCode}
                  InputProps={{
                    className: "font-aeonik text-[#e1e1e1] text-center border border-[#4E5257] h-11 mt-[20px]",
                  }}
                  inputProps={{ className: "text-center" }}
                  onChange={(event) => {
                    setManualCode(event.target.value);
                  }}
                />
                <div
                  className="flex justify-center items-center cursor-pointer"
                  onClick={() => setUseAuthTx((current) => !current)}
                >
                  <Checkbox
                    checked={useAuthTx}
                    sx={{
                      color: grey[800],
                      "&.Mui-checked": {
                        color: grey[600],
                      },
                    }}
                  />
                  <span className="mr-[8px]">Use tx signing</span>
                  <HtmlTooltip
                    title={
                      <>
                        <div className="flex flex-col gap-2 pb-2">
                          Certain hardware wallet versions do not support memo signing.
                        </div>
                        <div className="flex flex-col gap-2 pb-2">
                          Use this option if you are unable to proceed with memo signing. It is free as well and will
                          not involve the network.
                        </div>
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </HtmlTooltip>
                </div>
                <Button
                  size="large"
                  className={`bg-white text-black normal-case text-[10px] sm:text-sm mx-2 mt-[20px] sm:mx-0 w-14 sm:w-32 h-11 rounded-md max-w-[115px]`}
                  style={{
                    fontWeight: 300,
                  }}
                  onClick={signup}
                >
                  Signup
                </Button>
              </div>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Login: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [useAuthTx, setUseAuthTx] = useState(false);
  const login = useCallback(async () => {
    toast.info("Logging in...");
    const blockhashInfo = await connection.getLatestBlockhash();
    try {
      await firebaseApi.login(wallet, useAuthTx ? "tx" : "memo", blockhashInfo);
      // localStorage.setItem("authData", JSON.stringify(signedAuthData));
      toast.success("Logged in successfully");
    } catch (loginError: any) {
      toast.error(loginError.message);
    }
  }, [connection, useAuthTx, wallet]);

  return (
    <Card className="w-2/3 bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
      <CardContent>
        <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
          <div>
            <span className="text-2xl font-[500]">Access upgraded features</span>
            <br />
            <br />
            Login to your points account by signing a message.
          </div>
          <div className="w-full flex justify-center items-center mt-[20px]">
            {wallet.connected ? (
              <div>
                <div
                  className="flex justify-center items-center cursor-pointer"
                  onClick={() => setUseAuthTx((current) => !current)}
                >
                  <Checkbox
                    checked={useAuthTx}
                    sx={{
                      color: grey[800],
                      "&.Mui-checked": {
                        color: grey[600],
                      },
                    }}
                  />
                  <span className="mr-[8px]">Use tx signing</span>
                  <HtmlTooltip
                    title={
                      <>
                        <div className="flex flex-col gap-2 pb-2">
                          Certain hardware wallet versions do not support memo signing.
                        </div>
                        <div className="flex flex-col gap-2 pb-2">
                          Use this option if you are unable to proceed with memo signing. It is free as well and will
                          not involve the network.
                        </div>
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </HtmlTooltip>
                </div>
                <Button
                  size="large"
                  className={`bg-white text-black normal-case text-[10px] sm:text-sm mx-2 mt-[20px] sm:mx-0 w-14 sm:w-32 h-11 rounded-md max-w-[115px]`}
                  style={{
                    fontWeight: 300,
                  }}
                  onClick={login}
                >
                  Login
                </Button>
              </div>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Points;
