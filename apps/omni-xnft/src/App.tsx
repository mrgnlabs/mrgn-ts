import { registerRootComponent } from "expo";
import { RecoilRoot } from "recoil";
import { Iframe } from "react-xnft";

function App() {
  return (
    <RecoilRoot>
      <Iframe
        src="https://omni.marginfi.com"
        style={{
          width: "100%",
          height: "100%",
        }}
      ></Iframe>
    </RecoilRoot>
  );
}

export default registerRootComponent(App);
