import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { percentFormatter } from "@mrgnlabs/mrgn-common";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  amount: number;
};

export const SemiCircleProgress = ({ amount }: Props) => {
  const rotationAnimation = useRef(null);
  const [progressColor, setProgressColor] = useState<string>("#75BA80");

  useEffect(() => {
    if (amount) {
      let color;

      if (amount >= 50) {
        color = "#75ba80"; // green color
      } else if (amount >= 25) {
        color = "#FABD12"; // yellow color
      } else {
        color = "#E06D6F"; // red color
      }

      setProgressColor(color);
    }
  }, [amount]);

  const rotateAnimation = keyframes`
    0% {
      transform: translateY(-50px) rotate(0deg) translateY(50px);
    }
    100% {
      transform: translateY(-50px) rotate(${(amount / 100) * 180}deg) translateY(50px);
    }
    `;

  const SemiCircleWrapper = styled.div({
    position: "relative",
    ".exteriorCircle": {
      position: "relative",
      width: "200px",
      height: "100px",
      borderRadius: "100px",
      backgroundColor: "#3D3D3D",
      borderBottomLeftRadius: "0",
      borderBottomRightRadius: "0",
      alignItems: "center",
      overflow: "hidden",
    },

    ".interiorCircle": {
      position: "relative",
      width: "180px",
      height: "90px",
      borderRadius: "90px",
      backgroundColor: "#171C1F",
      top: "10px",
      marginLeft: "auto",
      marginRight: "auto",
      borderBottomLeftRadius: "0",
      borderBottomRightRadius: "0",
      alignItems: "center",
      overflow: "hidden",
    },

    ".healthLabelWrapper": {
      display: "flex",
      position: "relative",
      justifyContent: "center",
      width: "100%",
      height: "100%",
    },

    ".healthLabel": {
      position: "absolute",
      bottom: 0,
      color: progressColor,
      fontSize: "26px",
      lineHeight: "26px",
      fontWeight: 600,
    },

    ".rotatingCircleWrap": {
      position: "absolute",
      backgroundColor: "#171C1F",
      left: "0px",
      width: "200px",
      height: "100px",
      top: "100px",
    },

    ".rotatingCircle": {
      // position: "absolute",
      overflow: "hidden",
      top: "0px",
      left: "0px",
      borderRadius: "100px",
      borderTopLeftRadius: "0px",
      borderTopRightRadius: "0px",
      width: "200px",
      height: "100px",
      backgroundColor: progressColor,
      animation: rotateAnimation,
      animationDuration: "1s",
      transform: `translateY(-50px) rotate(${(amount / 100) * 180}deg) translateY(50px)`,
    },
  });

  return (
    <SemiCircleWrapper>
      <div className="exteriorCircle">
        <div className="rotatingCircleWrap">
          <div className="rotatingCircle" ref={rotationAnimation} color={progressColor} />
        </div>

        <div className="interiorCircle">
          <div className="healthLabelWrapper">
            <span className="healthLabel">{percentFormatter.format(amount / 100)}</span>
          </div>
        </div>
      </div>
    </SemiCircleWrapper>
  );
};
