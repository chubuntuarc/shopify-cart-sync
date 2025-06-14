import { useEffect } from "react";

export default function Local() {
  useEffect(() => {
    console.log("Local");
  }, []);
  return <div>Local</div>;
}