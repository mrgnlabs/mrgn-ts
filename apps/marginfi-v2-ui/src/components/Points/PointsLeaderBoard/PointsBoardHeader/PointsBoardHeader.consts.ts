interface HeadCell {
  disablePadding: boolean;
  id: string;
  label: string;
  numeric: boolean;
}

export const headCells: readonly HeadCell[] = [
  {
    id: "rank",
    numeric: false,
    disablePadding: false,
    label: "Rank",
  },
  {
    id: "id",
    numeric: false,
    disablePadding: false,
    label: "User",
  },
  {
    id: "total_activity_deposit_points",
    numeric: true,
    disablePadding: false,
    label: "Lending Points",
  },
  {
    id: "total_activity_borrow_points",
    numeric: true,
    disablePadding: false,
    label: "Borrowing Points",
  },
  {
    id: "total_referral_borrow_points",
    numeric: true,
    disablePadding: false,
    label: "Referral Points",
  },
  {
    id: "socialPoints",
    numeric: true,
    disablePadding: false,
    label: "Social Points",
  },
  {
    id: "total_points",
    numeric: true,
    disablePadding: false,
    label: "Total Points",
  },
];
