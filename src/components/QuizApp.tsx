import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Layout,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Card,
  message,
} from "antd";
import {
  PauseCircleOutlined,
  SoundOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { questions } from "../data/questions";
import { QuestionCard } from "./QuestionCard";
import { VoiceSelector } from "./VoiceSelector";
import { Question, VoiceOption } from "../types";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export const QuizApp: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]); // eslint-disable-line

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Khởi tạo speech synthesis và giọng nói
  useEffect(() => {
    speechSynthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices
        .filter((voice) => voice.lang.startsWith("en-"))
        .map((voice) => {
          const gender: VoiceOption["gender"] = voice.name
            .toLowerCase()
            .includes("female")
            ? "female"
            : "male";
          return {
            name: voice.name,
            lang: voice.lang,
            gender,
          };
        });

      setAvailableVoices(englishVoices);

      if (englishVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(englishVoices[0].name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  // Khởi tạo câu hỏi đầu tiên
  useEffect(() => {
    getRandomQuestion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSpeaking = useCallback(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsPlaying(false);
    }
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current = null;
    }
  }, []);

  const getRandomQuestion = useCallback(() => {
    // If all questions have been answered, show a completion message and reset
    if (answeredQuestions.length >= questions.length) {
      message.success("🎉 Chúc mừng! Bạn đã hoàn thành tất cả các câu hỏi!");
      setCurrentQuestion(null);
      return;
    }

    // Get all unanswered questions
    const unansweredQuestions = questions.filter(
      (q) => !answeredQuestions.includes(q.id)
    );

    // Select a random question from unanswered ones
    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
    const question = unansweredQuestions[randomIndex];

    setCurrentQuestion(question);
    setUserAnswer("");
    setShowAnswer(false);
    stopSpeaking();
  }, [answeredQuestions, stopSpeaking]);

  const speakText = useCallback(
    (text: string, voiceName?: string) => {
      if (!speechSynthRef.current) return;

      // Dừng giọng nói hiện tại
      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.8; // Tốc độ chậm cho người cao niên
      utterance.pitch = 1;
      utterance.volume = 1;

      // Tìm giọng nói được chọn
      const voices = speechSynthRef.current.getVoices();
      const voiceToUse = voiceName || selectedVoice;

      // Tìm giọng phù hợp
      let selectedVoiceObj = voices.find((voice) => voice.name === voiceToUse);

      // Nếu không tìm thấy chính xác, tìm giọng có chứa tên
      if (!selectedVoiceObj) {
        selectedVoiceObj = voices.find((voice) =>
          voice.name.toLowerCase().includes(voiceToUse.toLowerCase())
        );
      }

      // Ưu tiên giọng tiếng Anh
      if (!selectedVoiceObj) {
        selectedVoiceObj = voices.find(
          (voice) =>
            voice.lang.startsWith("en-") || voice.lang.startsWith("en_")
        );
      }

      // Fallback: giọng đầu tiên có sẵn
      if (!selectedVoiceObj && voices.length > 0) {
        selectedVoiceObj = voices[0];
      }

      if (selectedVoiceObj) {
        utterance.voice = selectedVoiceObj;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        currentUtteranceRef.current = utterance;
      };

      utterance.onend = () => {
        setIsPlaying(false);
        currentUtteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsPlaying(false);
        currentUtteranceRef.current = null;
        message.error("Lỗi phát âm thanh. Vui lòng thử lại với giọng khác.");
      };

      try {
        speechSynthRef.current.speak(utterance);
      } catch (error) {
        console.error("Error speaking text:", error);
        message.error(
          "Không thể phát âm thanh. Vui lòng kiểm tra trình duyệt."
        );
      }
    },
    [selectedVoice, stopSpeaking]
  );

  const handleVoiceChange = useCallback((voiceName: string) => {
    setSelectedVoice(voiceName);
    message.success(`Đã chọn giọng: ${voiceName}`);
  }, []);

  const handleTestVoice = useCallback(
    (voiceName: string) => {
      speakText(
        "Hello, this is a voice test for US citizenship practice.",
        voiceName
      );
    },
    [speakText]
  );

  const handleCheckAnswer = () => {
    if (!currentQuestion) return;

    setShowAnswer(true);
    setAnsweredQuestions((prev) => [...prev, currentQuestion.id]);

    // Enhanced answer matching logic
    const isAnswerCorrect = (userAnswer: string, correctAnswer: string) => {
      const userAnswerNormalized = userAnswer.toLowerCase().trim();
      const correctAnswerNormalized = correctAnswer.toLowerCase();

      // Split by commas and clean up each part
      const correctAnswerParts = correctAnswerNormalized
        .split(",")
        .map((part) => part.trim().replace(/\.$/, "")); // Remove trailing periods

      // Check direct match first
      if (correctAnswerParts.some((part) => userAnswerNormalized === part)) {
        return true;
      }

      // Check if user's answer contains any correct part
      if (
        correctAnswerParts.some((part) => userAnswerNormalized.includes(part))
      ) {
        return true;
      }

      // Check if any correct part contains user's answer
      if (
        correctAnswerParts.some((part) => part.includes(userAnswerNormalized))
      ) {
        return true;
      }

      // For answers with "or" alternatives
      const orParts = correctAnswerNormalized
        .split(" or ")
        .map((part) => part.trim());
      if (
        orParts.some(
          (part) =>
            userAnswerNormalized === part || part.includes(userAnswerNormalized)
        )
      ) {
        return true;
      }

      return false;
    };

    if (isAnswerCorrect(userAnswer, currentQuestion.answer)) {
      setCorrectAnswers((prev) => [...prev, currentQuestion.id]);
    }
  };

  const handleNextQuestion = () => {
    getRandomQuestion();
  };

  const resetQuiz = () => {
    setAnsweredQuestions([]);
    setCorrectAnswers([]);
    getRandomQuestion();
    stopSpeaking();
    message.info("Đã làm mới bài kiểm tra!");
  };

  const progress = (answeredQuestions.length / questions.length) * 100;
  const score =
    answeredQuestions.length > 0
      ? Math.round((correctAnswers.length / answeredQuestions.length) * 100)
      : 0;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ background: "#001529", padding: "0 20px" }}>
        <Title
          level={2}
          style={{ color: "white", margin: 0, lineHeight: "64px" }}
        >
          🇺🇸 Luyện Thi Quốc Tịch Hoa Kỳ
        </Title>
      </Header>

      <Layout>
        <Sider width={300} style={{ background: "#fff", padding: "20px" }}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <VoiceSelector
              selectedVoice={selectedVoice}
              onVoiceChange={handleVoiceChange}
              onTestVoice={handleTestVoice}
            />

            <Card title="Thống kê" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Statistic title="Điểm số" value={score} suffix="%" />
                <Statistic
                  title="Đã trả lời"
                  value={answeredQuestions.length}
                  suffix={`/ ${questions.length}`}
                />
                <Progress percent={Math.round(progress)} />
              </Space>
            </Card>

            <Card title="Điều khiển" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={resetQuiz}
                  block
                >
                  Làm mới
                </Button>
                <Button
                  icon={isPlaying ? <PauseCircleOutlined /> : <SoundOutlined />}
                  onClick={() =>
                    isPlaying
                      ? stopSpeaking()
                      : currentQuestion && speakText(currentQuestion.question)
                  }
                  block
                  disabled={!currentQuestion}
                >
                  {isPlaying ? "Dừng" : "Nghe câu hỏi"}
                </Button>
              </Space>
            </Card>

            <Card title="Phân loại câu hỏi" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text style={{ fontSize: "12px" }}>
                  Principles of American Democracy: 12 câu
                </Text>
                <Text style={{ fontSize: "12px" }}>
                  System of Government: 35 câu
                </Text>
                <Text style={{ fontSize: "12px" }}>
                  Rights and Responsibilities: 10 câu
                </Text>
                <Text style={{ fontSize: "12px" }}>
                  American History: 48 câu
                </Text>
                <Text style={{ fontSize: "12px" }}>
                  Integrated Civics: 20 câu
                </Text>
              </Space>
            </Card>
          </Space>
        </Sider>

        <Content style={{ padding: "20px" }}>
          <Row justify="center">
            <Col xs={24} lg={18}>
              {currentQuestion ? (
                <QuestionCard
                  question={currentQuestion}
                  userAnswer={userAnswer}
                  showAnswer={showAnswer}
                  onAnswerChange={setUserAnswer}
                  onSpeak={speakText}
                />
              ) : (
                <Card>
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <Title level={3}>🎉 Hoàn thành!</Title>
                    <Text>
                      Bạn đã trả lời tất cả {questions.length} câu hỏi. Nhấn
                      "Làm mới" để bắt đầu lại.
                    </Text>
                  </div>
                </Card>
              )}

              <Card style={{ marginTop: "20px" }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Button
                      size="large"
                      onClick={handleNextQuestion}
                      disabled={!currentQuestion}
                    >
                      Câu hỏi tiếp theo
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleCheckAnswer}
                      disabled={
                        !userAnswer.trim() || showAnswer || !currentQuestion
                      }
                    >
                      Kiểm tra đáp án
                    </Button>
                  </Col>
                </Row>
              </Card>

              {/* Hướng dẫn sử dụng */}
              <Card title="Hướng dẫn sử dụng" style={{ marginTop: "20px" }}>
                <Space direction="vertical">
                  <Text>
                    1. Chọn giọng đọc phù hợp ở bên trái (nhấn nút loa để nghe
                    thử)
                  </Text>
                  <Text>
                    2. Nhấn "Nghe câu hỏi" để nghe câu hỏi bằng tiếng Anh
                  </Text>
                  <Text>3. Nhập câu trả lời của bạn vào ô trống</Text>
                  <Text>4. Nhấn "Kiểm tra đáp án" để xem kết quả</Text>
                  <Text>
                    5. Nhấn "Nghe đáp án" để nghe đáp án đúng bằng tiếng Anh
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};
