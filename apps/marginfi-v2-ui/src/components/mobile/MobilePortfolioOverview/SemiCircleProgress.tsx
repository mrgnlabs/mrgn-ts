import React, { useMemo, useRef } from "react";
import styled from "@emotion/styled";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

type Props = {
  amount: number;
};

export const SemiCircleProgress = ({ amount }: Props) => {
  const rotateAnimation = useRef(null);

  const progressColor = useMemo(() => {
    if (amount) {
      if (amount >= 50) {
        return "#75ba80"; // green color
      } else if (amount >= 25) {
        return "#FABD12"; // yellow color
      } else {
        return "#E06D6F"; // red color
      }
    }
  }, [amount]);

  // Bugged annimation
  // useEffectOnce(() => {
  //   if (!rotateAnimation.current) {
  //     console.log("how?");
  //     const castAmount = amount.toString();
  //     rotateAnimation.current = keyframes`
  //       0% {
  //         transform: translateY(-50px) rotate(0deg) translateY(50px);
  //       }
  //       100% {
  //         transform: translateY(-50px) rotate(${(Number(castAmount) / 100) * 180}deg) translateY(50px);
  //       }
  //     `;
  //   }
  // });

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
      backgroundColor: "#1A1F22",
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
      backgroundColor: "#131619",
      left: "0px",
      width: "200px",
      height: "100px",
      top: "100px",
    },

    ".rotatingCircle": {
      overflow: "hidden",
      top: "0px",
      left: "0px",
      borderRadius: "100px",
      borderTopLeftRadius: "0px",
      borderTopRightRadius: "0px",
      width: "200px",
      height: "100px",
      backgroundColor: progressColor,
      transform: `translateY(-50px) rotate(${(amount / 100) * 180}deg) translateY(50px)`,
    },
  });

  return (
    <SemiCircleWrapper>
      <div className="exteriorCircle">
        <div className="rotatingCircleWrap">
          <div className="rotatingCircle" />
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
