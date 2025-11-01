import React, { useEffect, useState, useRef } from "react";
import { Space } from "antd";

interface LipSyncFaceProps {
  isSpeaking: boolean;
  text?: string;
  emotion?:
    | "neutral"
    | "happy"
    | "surprised"
    | "thinking"
    | "correct"
    | "incorrect";
  aiAnalysis?: {
    confidence: number;
    emotion: string;
  };
}

export const LipSyncFace: React.FC<LipSyncFaceProps> = ({
  isSpeaking,
  text = "",
  emotion = "neutral",
}) => {
  const [mouthPosition, setMouthPosition] = useState<
    "closed" | "slightlyOpen" | "open" | "wideOpen"
  >("closed");
  const [eyeBlink, setEyeBlink] = useState(false);
  const animationRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const blinkRef = useRef<number>(0);

  // Hiệu ứng chớp mắt tự nhiên
  useEffect(() => {
    const blink = () => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 150);
    };

    blinkRef.current = window.setInterval(blink, 3000 + Math.random() * 2000);

    return () => {
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
      }
    };
  }, []);

  // Logic đồng bộ hóa môi
  useEffect(() => {
    if (!isSpeaking) {
      setMouthPosition("closed");
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;

      if (elapsed > 120) {
        // Tốc độ đồng bộ hóa nhanh hơn để tự nhiên hơn
        // Tạo chu kỳ nói tự nhiên
        const cycle = (timestamp / 120) % 8;
        let newMouthPosition: typeof mouthPosition;

        if (cycle < 2) newMouthPosition = "closed";
        else if (cycle < 4) newMouthPosition = "slightlyOpen";
        else if (cycle < 6) newMouthPosition = "open";
        else newMouthPosition = "wideOpen";

        setMouthPosition(newMouthPosition);
        lastUpdateRef.current = timestamp;
      }

      if (isSpeaking) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking]);

  const renderFace = () => {
    const faceStyle: React.CSSProperties = {
      width: "140px",
      height: "140px",
      borderRadius: "50%",
      backgroundColor: emotion === "happy" ? "#FFECB3" : "#FFE0B2",
      border: `2px solid ${emotion === "surprised" ? "#FF9800" : "#FFB74D"}`,
      position: "relative",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      transition: "all 0.3s ease",
    };

    const eyeStyle: React.CSSProperties = {
      width: eyeBlink ? "16px" : "20px",
      height: eyeBlink ? "2px" : "20px",
      backgroundColor: "#5D4037",
      borderRadius: eyeBlink ? "1px" : "50%",
      position: "absolute",
      top: "35px",
      transition: "all 0.1s ease",
    };

    const eyebrowStyle: React.CSSProperties = {
      width: "24px",
      height: "4px",
      backgroundColor: "#5D4037",
      borderRadius: "2px",
      position: "absolute",
      top: "25px",
    };

    const mouthStyle: React.CSSProperties = {
      position: "absolute",
      bottom: "30px",
      backgroundColor: emotion === "happy" ? "#E57373" : "#E53935",
      borderRadius:
        emotion === "happy"
          ? "50%"
          : mouthPosition === "closed"
          ? "2px"
          : mouthPosition === "slightlyOpen"
          ? "4px 4px 8px 8px"
          : mouthPosition === "open"
          ? "4px 4px 12px 12px"
          : "4px 4px 16px 16px",
      transition: "all 0.15s ease",
    };

    const mouthDimensions = {
      closed: { width: "20px", height: "4px" },
      slightlyOpen: { width: "24px", height: "8px" },
      open: { width: "28px", height: "12px" },
      wideOpen: { width: "32px", height: "16px" },
    };

    return (
      <div style={faceStyle}>
        {/* Lông mày trái */}
        <div
          style={{
            ...eyebrowStyle,
            left: "28px",
            transform: emotion === "surprised" ? "rotate(-5deg)" : "none",
          }}
        />
        {/* Lông mày phải */}
        <div
          style={{
            ...eyebrowStyle,
            right: "28px",
            transform: emotion === "surprised" ? "rotate(5deg)" : "none",
          }}
        />
        {/* Mắt trái */}
        <div style={{ ...eyeStyle, left: "32px" }} />
        {/* Mắt phải */}
        <div style={{ ...eyeStyle, right: "32px" }} />
        {/* Miệng */}
        <div
          style={{
            ...mouthStyle,
            ...mouthDimensions[mouthPosition],
          }}
        />
      </div>
    );
  };

  return (
    <Space direction="vertical" style={{ width: "100%", textAlign: "center" }}>
      {renderFace()}
      <div
        style={{
          fontSize: "12px",
          color: "#666",
          marginTop: "8px",
        }}
      >
        {isSpeaking ? "🎤 Đang nói..." : "👁️ Sẵn sàng"}
        {emotion !== "neutral" &&
          ` | Cảm xúc: ${emotion === "happy" ? "😊 Vui vẻ" : "😮 Ngạc nhiên"}`}
      </div>
    </Space>
  );
};
