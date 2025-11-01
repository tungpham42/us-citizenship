import React from "react";
import { Card, Button, Space, Typography, Alert } from "antd";
import { SoundOutlined, LoadingOutlined } from "@ant-design/icons";
import { Question } from "../types";

const { Title, Text } = Typography;

interface QuestionCardProps {
  question: Question;
  userAnswer: string;
  showAnswer: boolean;
  onAnswerChange: (answer: string) => void;
  onSpeak: (text: string) => void;
  isPlaying?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  userAnswer,
  showAnswer,
  onAnswerChange,
  onSpeak,
  isPlaying = false,
}) => {
  // Helper function to check if answer is correct (partial match)
  const isAnswerCorrect = (userAnswer: string, correctAnswer: string) => {
    const correctAnswerParts = correctAnswer
      .toLowerCase()
      .split(",")
      .map((part) => part.trim());

    const userAnswerNormalized = userAnswer.toLowerCase().trim();

    return correctAnswerParts.some(
      (part) =>
        userAnswerNormalized === part ||
        part.includes(userAnswerNormalized) ||
        userAnswerNormalized.includes(part)
    );
  };

  const isCorrect = showAnswer && isAnswerCorrect(userAnswer, question.answer);

  return (
    <Card
      title={
        <Space wrap>
          <span style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>
            Câu hỏi #{question.id}
          </span>
          <Text
            type="secondary"
            style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
          >
            ({question.category})
          </Text>
        </Space>
      }
      extra={
        <Button
          icon={isPlaying ? <LoadingOutlined /> : <SoundOutlined />}
          onClick={() => onSpeak(question.question)}
          type="text"
          loading={isPlaying}
          size={window.innerWidth < 480 ? "small" : "middle"}
        >
          {isPlaying ? "Đang phát..." : "Nghe"}
        </Button>
      }
    >
      <Title level={4} style={{ fontSize: "clamp(16px, 4vw, 20px)" }}>
        {question.question}
      </Title>

      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <Text strong style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>
            Trả lời của bạn:
          </Text>
          <br />
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Nhập câu trả lời của bạn..."
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "clamp(14px, 3vw, 16px)",
              marginTop: "8px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
            }}
          />
        </div>

        {showAnswer && (
          <Alert
            message={isCorrect ? "Chính xác! 🎉" : "Chưa chính xác"}
            description={
              !isCorrect
                ? `Đáp án đúng: ${question.answer}`
                : "Bạn đã trả lời đúng!"
            }
            type={isCorrect ? "success" : "error"}
            showIcon
            action={
              <Button
                size="small"
                icon={<SoundOutlined />}
                onClick={() => onSpeak(question.answer)}
              >
                Nghe đáp án
              </Button>
            }
          />
        )}
      </Space>
    </Card>
  );
};
