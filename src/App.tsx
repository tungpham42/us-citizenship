import React from "react";
import { ConfigProvider } from "antd";
import { QuizApp } from "./components/QuizApp";
import vi_VN from "antd/locale/vi_VN";

const App: React.FC = () => {
  return (
    <ConfigProvider locale={vi_VN}>
      <QuizApp />
    </ConfigProvider>
  );
};

export default App;
