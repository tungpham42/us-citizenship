// QuizApp.tsx
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
  Modal,
  Form,
  Input,
  Alert,
} from "antd";
import {
  PauseCircleOutlined,
  SoundOutlined,
  ReloadOutlined,
  RobotOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { questions } from "../data/questions";
import { QuestionCard } from "./QuestionCard";
import { VoiceSelector } from "./VoiceSelector";
import { LipSyncFace } from "./LipSyncFace";
import { Question, VoiceOption } from "../types";
import { GeminiService } from "../services/geminiService";

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
  const [currentSpokenText, setCurrentSpokenText] = useState("");
  const [geminiService, setGeminiService] = useState<GeminiService | null>(
    null
  );
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiEmotion, setAiEmotion] = useState<
    "neutral" | "happy" | "surprised" | "thinking" | "correct" | "incorrect"
  >("neutral");

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech synthesis and voices
  useEffect(() => {
    speechSynthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices
        .filter(
          (voice) =>
            voice.lang.startsWith("en-") || voice.lang.startsWith("en_")
        )
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

  // Initialize Gemini API
  useEffect(() => {
    const savedApiKey = localStorage.getItem("gemini_api_key");
    if (savedApiKey) {
      try {
        const service = new GeminiService(savedApiKey);
        setGeminiService(service);
        message.success("Đã kết nối AI thành công!");
      } catch (error) {
        console.error("Error initializing Gemini:", error);
        message.error("Lỗi kết nối AI. Vui lòng kiểm tra lại API key.");
      }
    }
  }, []);

  // Initialize first question
  useEffect(() => {
    getRandomQuestion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSpeaking = useCallback(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsPlaying(false);
      setCurrentSpokenText("");
    }
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current = null;
    }
  }, []);

  const getRandomQuestion = useCallback(() => {
    // If all questions have been answered, show completion message
    if (answeredQuestions.length >= questions.length) {
      message.success("🎉 Chúc mừng! Bạn đã hoàn thành tất cả các câu hỏi!");
      setCurrentQuestion(null);
      setAiExplanation("");
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
    setAiExplanation("");
    setAiEmotion("neutral");
    stopSpeaking();
  }, [answeredQuestions, stopSpeaking]);

  const speakText = useCallback(
    (text: string, voiceName?: string) => {
      if (!speechSynthRef.current) return;

      // Stop current speech
      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Set current spoken text for lip syncing
      setCurrentSpokenText(text);

      // Find selected voice
      const voices = speechSynthRef.current.getVoices();
      const voiceToUse = voiceName || selectedVoice;

      // Find matching voice
      let selectedVoiceObj = voices.find((voice) => voice.name === voiceToUse);

      // If not found exactly, find voice containing the name
      if (!selectedVoiceObj) {
        selectedVoiceObj = voices.find((voice) =>
          voice.name.toLowerCase().includes(voiceToUse.toLowerCase())
        );
      }

      // Prefer English voices
      if (!selectedVoiceObj) {
        selectedVoiceObj = voices.find(
          (voice) =>
            voice.lang.startsWith("en-") || voice.lang.startsWith("en_")
        );
      }

      // Fallback: first available voice
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
        setCurrentSpokenText("");
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsPlaying(false);
        currentUtteranceRef.current = null;
        setCurrentSpokenText("");
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

  const handleAIConfig = (values: { apiKey: string }) => {
    try {
      const service = new GeminiService(values.apiKey);
      setGeminiService(service);
      localStorage.setItem("gemini_api_key", values.apiKey);
      setShowAIConfig(false);
      message.success("Đã kết nối AI thành công!");
    } catch (error) {
      console.error("Error configuring Gemini:", error);
      message.error("Lỗi kết nối AI. Vui lòng kiểm tra API key.");
    }
  };

  const handleCheckAnswer = async () => {
    if (!currentQuestion) return;

    setShowAnswer(true);
    setAnsweredQuestions((prev) => [...prev, currentQuestion.id]);
    setAiEmotion("thinking");

    let isCorrect = false;

    // Use AI evaluation if available
    if (geminiService) {
      setIsAILoading(true);
      try {
        const evaluation = await geminiService.evaluateAnswer(
          currentQuestion.question,
          userAnswer,
          currentQuestion.answer
        );

        isCorrect = evaluation.isCorrect;
        setAiExplanation(evaluation.explanation);
        setAiEmotion(isCorrect ? "correct" : "incorrect");

        if (isCorrect) {
          setCorrectAnswers((prev) => [...prev, currentQuestion.id]);
          message.success(`🎉 Chính xác! ${evaluation.explanation}`);
        } else {
          message.error(`❌ ${evaluation.explanation}`);
        }
      } catch (error) {
        console.error("AI evaluation error:", error);
        // Fallback to basic evaluation
        isCorrect = handleBasicEvaluation(userAnswer, currentQuestion.answer);
        handleBasicResult(isCorrect);
        setAiExplanation("AI đang bận, sử dụng đánh giá cơ bản...");
      } finally {
        setIsAILoading(false);
      }
    } else {
      // Basic evaluation without AI
      isCorrect = handleBasicEvaluation(userAnswer, currentQuestion.answer);
      handleBasicResult(isCorrect);
      setAiEmotion(isCorrect ? "correct" : "incorrect");
    }
  };

  const handleBasicEvaluation = (
    userAnswer: string,
    correctAnswer: string
  ): boolean => {
    const userAnswerNormalized = userAnswer.toLowerCase().trim();
    const correctAnswerNormalized = correctAnswer.toLowerCase();

    // Split by commas and clean up each part
    const correctAnswerParts = correctAnswerNormalized
      .split(",")
      .map((part) => part.trim().replace(/\.$/, ""));

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

  const handleBasicResult = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectAnswers((prev) => [...prev, currentQuestion!.id]);
      message.success("🎉 Chính xác! Câu trả lời đúng!");
    } else {
      message.error("❌ Câu trả lời chưa chính xác. Hãy thử lại!");
    }
  };

  const generateAIQuestion = async (category?: string) => {
    if (!geminiService) {
      message.warning("Vui lòng cấu hình API key Gemini trước!");
      setShowAIConfig(true);
      return;
    }

    setIsAILoading(true);
    setAiEmotion("thinking");
    try {
      const aiQuestion = await geminiService.generatePracticeQuestion(category);
      const newQuestion: Question = {
        id: Date.now(), // Temporary ID for AI questions
        question: aiQuestion,
        answer: "Câu trả lời sẽ được AI đánh giá dựa trên ngữ cảnh",
        category: category || "AI Generated",
      };

      setCurrentQuestion(newQuestion);
      setUserAnswer("");
      setShowAnswer(false);
      setAiExplanation("");
      message.success("Đã tạo câu hỏi thông minh từ AI!");
    } catch (error) {
      console.error("Error generating AI question:", error);
      message.error("Lỗi tạo câu hỏi AI. Vui lòng thử lại.");
    } finally {
      setIsAILoading(false);
      setAiEmotion("neutral");
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
    setAiExplanation("");
    setAiEmotion("neutral");
    message.info("Đã làm mới bài kiểm tra!");
  };

  const progress = (answeredQuestions.length / questions.length) * 100;
  const score =
    answeredQuestions.length > 0
      ? Math.round((correctAnswers.length / answeredQuestions.length) * 100)
      : 0;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#001529",
          padding: "0 16px",
          height: "auto",
          minHeight: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Title
            level={2}
            style={{
              color: "white",
              margin: 0,
              lineHeight: "1.4",
              padding: "12px 0",
              fontSize: "clamp(18px, 5vw, 24px)",
            }}
          >
            🇺🇸 Luyện Thi Quốc Tịch Hoa Kỳ
          </Title>
          <Button
            icon={<RobotOutlined />}
            onClick={() => setShowAIConfig(true)}
            type={geminiService ? "default" : "dashed"}
            style={{
              color: geminiService ? "#52c41a" : "#ffa940",
              borderColor: geminiService ? "#52c41a" : "#ffa940",
              margin: "8px 0",
            }}
            size={window.innerWidth < 768 ? "middle" : "large"}
          >
            {geminiService ? "🤖 AI Đã Kết Nối" : "🔌 Kết Nối AI"}
          </Button>
        </div>
      </Header>

      <Layout
        style={{ flexDirection: window.innerWidth < 768 ? "column" : "row" }}
      >
        <Sider
          width={window.innerWidth < 768 ? "100%" : 300}
          style={{
            background: "#fff",
            padding: "16px",
            height: window.innerWidth < 768 ? "auto" : "auto",
          }}
          breakpoint="lg"
          collapsedWidth="0"
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* Lip Sync Face Component */}
            <Card title="Khuôn mặt đồng bộ hóa" size="small">
              <LipSyncFace
                isSpeaking={isPlaying}
                text={currentSpokenText}
                emotion={aiEmotion}
              />
            </Card>

            <VoiceSelector
              selectedVoice={selectedVoice}
              onVoiceChange={handleVoiceChange}
              onTestVoice={handleTestVoice}
              geminiService={geminiService}
            />

            {/* AI Features Card */}
            {geminiService && (
              <Card title="Tính năng AI" size="small">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    icon={<BulbOutlined />}
                    onClick={() => generateAIQuestion()}
                    loading={isAILoading}
                    block
                    size={window.innerWidth < 768 ? "middle" : "small"}
                  >
                    Câu hỏi Thông minh
                  </Button>
                  <Text style={{ fontSize: "clamp(10px, 2.5vw, 12px)" }}>
                    🤖 AI sẽ tạo câu hỏi mới và đánh giá câu trả lời của bạn
                  </Text>
                </Space>
              </Card>
            )}

            <Card title="Thống kê" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Statistic title="Điểm số" value={score} suffix="%" />
                <Statistic
                  title="Đã trả lời"
                  value={answeredQuestions.length}
                  suffix={`/ ${questions.length}`}
                />
                <Progress percent={Math.round(progress)} />
                {geminiService && (
                  <div style={{ marginTop: "8px" }}>
                    <Text style={{ fontSize: "12px", color: "#52c41a" }}>
                      🤖 AI đang hoạt động
                    </Text>
                  </div>
                )}
              </Space>
            </Card>

            <Card title="Điều khiển" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={resetQuiz}
                  block
                  size={window.innerWidth < 768 ? "middle" : "small"}
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
                  size={window.innerWidth < 768 ? "middle" : "small"}
                >
                  {isPlaying ? "Dừng" : "Nghe câu hỏi"}
                </Button>
              </Space>
            </Card>

            <Card title="Phân loại câu hỏi" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text style={{ fontSize: "clamp(11px, 2.5vw, 12px)" }}>
                  Principles of American Democracy: 12 câu
                </Text>
                <Text style={{ fontSize: "clamp(11px, 2.5vw, 12px)" }}>
                  System of Government: 35 câu
                </Text>
                <Text style={{ fontSize: "clamp(11px, 2.5vw, 12px)" }}>
                  Rights and Responsibilities: 10 câu
                </Text>
                <Text style={{ fontSize: "clamp(11px, 2.5vw, 12px)" }}>
                  American History: 48 câu
                </Text>
                <Text style={{ fontSize: "clamp(11px, 2.5vw, 12px)" }}>
                  Integrated Civics: 20 câu
                </Text>
              </Space>
            </Card>
          </Space>
        </Sider>

        <Content style={{ padding: "16px", flex: 1 }}>
          <Row justify="center">
            <Col xs={24} lg={18}>
              {currentQuestion ? (
                <>
                  <QuestionCard
                    question={currentQuestion}
                    userAnswer={userAnswer}
                    showAnswer={showAnswer}
                    onAnswerChange={setUserAnswer}
                    onSpeak={speakText}
                    isPlaying={isPlaying}
                  />

                  {/* AI Explanation */}
                  {aiExplanation && (
                    <Card
                      style={{ marginTop: "16px" }}
                      title="📝 Giải thích từ AI"
                      size="small"
                    >
                      <Alert
                        message={aiExplanation}
                        type={aiEmotion === "correct" ? "success" : "error"}
                        showIcon
                      />
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Title
                      level={3}
                      style={{ fontSize: "clamp(18px, 5vw, 24px)" }}
                    >
                      🎉 Hoàn thành!
                    </Title>
                    <Text style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>
                      Bạn đã trả lời tất cả {questions.length} câu hỏi. Nhấn
                      "Làm mới" để bắt đầu lại.
                    </Text>
                    <br />
                    <Text
                      strong
                      style={{
                        fontSize: "clamp(14px, 3vw, 16px)",
                        color: "#1890ff",
                      }}
                    >
                      Điểm số cuối cùng: {score}%
                    </Text>
                    {geminiService && (
                      <div style={{ marginTop: "16px" }}>
                        <Text
                          style={{
                            fontSize: "clamp(12px, 3vw, 14px)",
                            color: "#52c41a",
                          }}
                        >
                          🤖 Sử dụng tính năng AI để tạo câu hỏi mới!
                        </Text>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Card style={{ marginTop: "16px" }}>
                <Row
                  justify="space-between"
                  align="middle"
                  gutter={[8, 8]}
                  style={{
                    flexDirection: window.innerWidth < 480 ? "column" : "row",
                  }}
                >
                  <Col>
                    <Button
                      size={window.innerWidth < 480 ? "middle" : "large"}
                      onClick={handleNextQuestion}
                      disabled={!currentQuestion || isAILoading}
                      block={window.innerWidth < 480}
                      loading={isAILoading}
                    >
                      {isAILoading ? "AI đang xử lý..." : "Câu hỏi tiếp theo"}
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      size={window.innerWidth < 480 ? "middle" : "large"}
                      onClick={handleCheckAnswer}
                      disabled={
                        !userAnswer.trim() ||
                        showAnswer ||
                        !currentQuestion ||
                        isAILoading
                      }
                      block={window.innerWidth < 480}
                      loading={isAILoading}
                    >
                      {isAILoading ? "AI đang đánh giá..." : "Kiểm tra đáp án"}
                    </Button>
                  </Col>
                </Row>
              </Card>

              {/* Usage Guide */}
              <Card title="Hướng dẫn sử dụng" style={{ marginTop: "16px" }}>
                <Space direction="vertical">
                  <Text style={{ fontSize: "clamp(12px, 3vw, 14px)" }}>
                    1. Chọn giọng đọc phù hợp ở bên trái (nhấn nút loa để nghe
                    thử)
                  </Text>
                  <Text style={{ fontSize: "clamp(12px, 3vw, 14px)" }}>
                    2. Nhấn "Nghe câu hỏi" để nghe câu hỏi bằng tiếng Anh
                  </Text>
                  <Text style={{ fontSize: "clamp(12px, 3vw, 14px)" }}>
                    3. Nhập câu trả lời của bạn vào ô trống
                  </Text>
                  <Text style={{ fontSize: "clamp(12px, 3vw, 14px)" }}>
                    4. Nhấn "Kiểm tra đáp án" để xem kết quả
                  </Text>
                  {geminiService && (
                    <Text
                      style={{
                        fontSize: "clamp(12px, 3vw, 14px)",
                        color: "#1890ff",
                      }}
                    >
                      5. 🤖 AI sẽ cung cấp giải thích chi tiết và đánh giá thông
                      minh
                    </Text>
                  )}
                  <Text style={{ fontSize: "clamp(12px, 3vw, 14px)" }}>
                    6. Quan sát khuôn mặt đồng bộ hóa để theo dõi phát âm
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* AI Configuration Modal */}
      <Modal
        title="🔌 Kết nối Gemini AI"
        open={showAIConfig}
        onCancel={() => setShowAIConfig(false)}
        footer={null}
        width={400}
      >
        <Form onFinish={handleAIConfig} layout="vertical">
          <Form.Item
            name="apiKey"
            label="Gemini API Key"
            rules={[{ required: true, message: "Vui lòng nhập API key" }]}
            help="Lấy API key miễn phí từ Google AI Studio"
          >
            <Input.Password
              placeholder="Nhập Gemini API key của bạn"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Kết nối AI
            </Button>
          </Form.Item>
        </Form>
        <Alert
          message="Hướng dẫn lấy API Key:"
          description={
            <div>
              1. Truy cập{" "}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google AI Studio
              </a>
              <br />
              2. Đăng nhập bằng tài khoản Google
              <br />
              3. Tạo API key mới
              <br />
              4. Sao chép và dán vào ô trên
            </div>
          }
          type="info"
          showIcon
        />
      </Modal>
    </Layout>
  );
};
