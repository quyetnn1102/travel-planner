export type AiRecommendation = {
  title: string;
  rationale: string;
  priority: "high" | "medium" | "low";
};

export type AiRecommendationsResponse = {
  recommendations: AiRecommendation[];
};
