import React, { FC, useCallback, useEffect, useState } from "react";
import styles from "./Countdown.module.css";

const Countdown: FC<{ targetDate: Date }> = ({ targetDate }) => {
  const [state, setState] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    days: "",
    hours: "",
    minutes: "",
    seconds: "",
  });

  const update = useCallback(() => {
    const now = new Date();
    const secondsRemaining = Math.max(0, (targetDate.getTime() - now.getTime()) / 1000);

    const seconds = Math.floor(secondsRemaining);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    setState({
      days: days.toString(),
      hours: (hours % 24).toString(),
      minutes: (minutes % 60).toString(),
      seconds: (seconds % 60).toString(),
    });
  }, [targetDate]);

  useEffect(() => {
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [update]);

  return (
    <div className={styles["countdown-wrapper"]}>
      <div className={styles["countdown-item"]}>
        {state.days}
        <span>{`day${state.days === "1" ? "" : "s"}`}</span>
      </div>
      <div className={styles["countdown-item"]}>
        {state.hours}
        <span>{`hour${state.hours === "1" ? "" : "s"}`}</span>
      </div>
      <div className={styles["countdown-item"]}>
        {state.minutes}
        <span>{`minute${state.minutes === "1" ? "" : "s"}`}</span>
      </div>
      <div className={styles["countdown-item"]}>
        {state.seconds}
        <span>{`second${state.seconds === "1" ? "" : "s"}`}</span>
      </div>
    </div>
  );
};

export { Countdown };
