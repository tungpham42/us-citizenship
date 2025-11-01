import React, { useState, useEffect } from "react";
import {
  Radio,
  Space,
  Card,
  Button,
  Alert,
  Modal,
  Typography,
  Slider,
} from "antd";
import { SoundOutlined, UserOutlined } from "@ant-design/icons";
import { VoiceOption } from "../types";
import { GeminiService } from "../services/geminiService";

const { Text } = Typography;

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onTestVoice: (voiceName: string) => void;
  geminiService?: GeminiService | null;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  onTestVoice,
  geminiService,
}) => {
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 0.8,
    pitch: 1,
    volume: 1,
  });

  // Lấy danh sách giọng nói có sẵn
  useEffect(() => {
    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();

        // Lọc giọng tiếng Anh và phân loại theo giới tính
        const englishVoices = voices.filter(
          (voice) =>
            voice.lang.startsWith("en-") || voice.lang.startsWith("en_")
        );

        const voiceOptions: VoiceOption[] = [];
        let hasFemale = false;
        let hasMale = false;

        // Tìm giọng nữ mặc định
        const femaleVoice = englishVoices.find(
          (voice) =>
            voice.name.toLowerCase().includes("female") ||
            voice.name.toLowerCase().includes("samantha") ||
            voice.name.toLowerCase().includes("zira") ||
            voice.name.toLowerCase().includes("victoria") ||
            voice.name.toLowerCase().includes("karen") ||
            voice.name.toLowerCase().includes("ava")
        );

        // Tìm giọng nam mặc định
        const maleVoice = englishVoices.find(
          (voice) =>
            voice.name.toLowerCase().includes("male") ||
            voice.name.toLowerCase().includes("alex") ||
            voice.name.toLowerCase().includes("david") ||
            voice.name.toLowerCase().includes("daniel") ||
            voice.name.toLowerCase().includes("fred") ||
            voice.name.toLowerCase().includes("tom")
        );

        // Thêm giọng nữ nếu tìm thấy
        if (femaleVoice) {
          voiceOptions.push({
            name: femaleVoice.name,
            lang: femaleVoice.lang,
            gender: "female",
            voiceURI: femaleVoice.voiceURI,
          });
          hasFemale = true;
        }

        // Thêm giọng nam nếu tìm thấy
        if (maleVoice) {
          voiceOptions.push({
            name: maleVoice.name,
            lang: maleVoice.lang,
            gender: "male",
            voiceURI: maleVoice.voiceURI,
          });
          hasMale = true;
        }

        // Nếu không tìm thấy giọng mặc định, thêm 2 giọng tiếng Anh đầu tiên
        if (voiceOptions.length === 0 && englishVoices.length >= 2) {
          voiceOptions.push({
            name: englishVoices[0].name,
            lang: englishVoices[0].lang,
            gender: "female",
            voiceURI: englishVoices[0].voiceURI,
          });
          voiceOptions.push({
            name: englishVoices[1].name,
            lang: englishVoices[1].lang,
            gender: "male",
            voiceURI: englishVoices[1].voiceURI,
          });
        } else if (englishVoices.length > 0) {
          // Thêm các giọng còn thiếu từ danh sách có sẵn
          for (const voice of englishVoices) {
            if (voiceOptions.length >= 2) break;

            const isFemale = voice.name.toLowerCase().includes("female");
            const isMale = voice.name.toLowerCase().includes("male");

            if (!isFemale && !isMale) {
              // Nếu không xác định được giới tính, thêm luân phiên
              const gender = voiceOptions.length === 0 ? "female" : "male";
              if (
                (gender === "female" && !hasFemale) ||
                (gender === "male" && !hasMale)
              ) {
                voiceOptions.push({
                  name: voice.name,
                  lang: voice.lang,
                  gender,
                  voiceURI: voice.voiceURI,
                });
                if (gender === "female") hasFemale = true;
                if (gender === "male") hasMale = true;
              }
            }
          }
        }

        setAvailableVoices(voiceOptions);

        // Tự động chọn giọng đầu tiên nếu chưa có giọng nào được chọn
        if (!selectedVoice && voiceOptions.length > 0) {
          onVoiceChange(voiceOptions[0].name);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading voices:", error);
        setIsLoading(false);
      }
    };

    // Tải giọng nói ngay lập tức
    loadVoices();

    // Chrome cần sự kiện này để tải giọng nói
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice, onVoiceChange]);

  const handleVoiceChange = (voiceName: string) => {
    onVoiceChange(voiceName);
  };

  if (isLoading) {
    return (
      <Card title="Chọn giọng đọc" size="small">
        <div>Đang tải giọng nói...</div>
      </Card>
    );
  }

  if (availableVoices.length === 0) {
    return (
      <Card title="Chọn giọng đọc" size="small">
        <Alert
          message="Không tìm thấy giọng nói"
          description="Trình duyệt của bạn không hỗ trợ Text-to-Speech hoặc không có giọng tiếng Anh."
          type="warning"
        />
      </Card>
    );
  }

  const handleAIVoicePractice = async () => {
    if (!geminiService) return;

    try {
      const question = await geminiService.generatePracticeQuestion();
      // Speak the AI-generated question
      onTestVoice(question);
    } catch (error) {
      console.error("Error generating AI question:", error);
    }
  };

  return (
    <Card title="Chọn giọng đọc & AI" size="small">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Radio.Group
          value={selectedVoice}
          onChange={(e) => handleVoiceChange(e.target.value)}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {availableVoices.map((voice) => (
              <div
                key={voice.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 0",
                  flexWrap: "wrap",
                }}
              >
                <Radio value={voice.name}>
                  <div style={{ fontSize: "clamp(11px, 2.5vw, 12px)" }}>
                    <div>
                      {voice.gender === "female"
                        ? "👩 Giọng Nữ"
                        : "👨 Giọng Nam"}
                    </div>
                    <div
                      style={{
                        color: "#666",
                        fontSize: "clamp(10px, 2.5vw, 11px)",
                      }}
                    >
                      {voice.name.length > 20
                        ? `${voice.name.substring(0, 20)}...`
                        : voice.name}
                    </div>
                  </div>
                </Radio>
                <Space>
                  <Button
                    size="small"
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={() => onTestVoice(voice.name)}
                    style={{ marginLeft: "8px" }}
                  />
                  {geminiService && (
                    <Button
                      size="small"
                      type="text"
                      icon={<UserOutlined />}
                      onClick={handleAIVoicePractice}
                      title="Luyện tập với AI"
                    />
                  )}
                </Space>
              </div>
            ))}
          </Space>
        </Radio.Group>

        {/* Voice Settings */}
        <div style={{ marginTop: "16px" }}>
          <Text strong>Tốc độ: {voiceSettings.rate.toFixed(1)}</Text>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={voiceSettings.rate}
            onChange={(value) =>
              setVoiceSettings((prev) => ({ ...prev, rate: value }))
            }
          />
        </div>

        <div
          style={{
            fontSize: "clamp(10px, 2.5vw, 12px)",
            color: "#666",
            marginTop: "8px",
          }}
        >
          💡 Nhấn vào nút loa để nghe thử giọng
          <br />
          🤖 Nhấn nút AI để luyện tập với câu hỏi thông minh
        </div>
      </Space>

      <Modal
        title="Luyện tập phát âm với AI"
        open={showAIModal}
        onCancel={() => setShowAIModal(false)}
        footer={null}
      >
        <p>Tính năng đang phát triển...</p>
      </Modal>
    </Card>
  );
};
