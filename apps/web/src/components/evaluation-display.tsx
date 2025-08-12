"use client";

import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import AppleActivityCard, {
  type ActivityData,
} from "./kokonutui/apple-activity-card";
import {
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Volume2,
  BarChart3,
  Heart,
} from "lucide-react";

interface TalkRatioSegment {
  seller: number;
  client: number;
  sentiment?: number;
  clientSentiment?: number;
}

interface EvaluationData {
  fillerWords?: string[];
  goodQuestions?: string[];
  badQuestions?: string[];
  talkRatiAndSentiment?: TalkRatioSegment[];
  generalStrenghts?: string[];
  generalWeaknesses?: string[];
  recommendations?: string[];
}

interface EvaluationDisplayProps {
  evaluation: EvaluationData;
  sessionId?: string;
}

export function EvaluationDisplay({
  evaluation,
  sessionId,
}: EvaluationDisplayProps) {
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 80) return "text-green-600 bg-green-50";
    if (sentiment >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 80) return "Positive";
    if (sentiment >= 60) return "Neutral";
    return "Negative";
  };

  const getSentimentValue = (segment: TalkRatioSegment): number => {
    return segment.clientSentiment ?? segment.sentiment ?? 50;
  };

  // Calculate talk ratio activities for Apple Activity Card
  const getTalkRatioActivities = (): ActivityData[] => {
    if (
      !evaluation.talkRatiAndSentiment ||
      evaluation.talkRatiAndSentiment.length === 0
    ) {
      return [];
    }

    const avgSellerRatio = Math.round(
      evaluation.talkRatiAndSentiment.reduce(
        (acc, seg) => acc + seg.seller,
        0
      ) / evaluation.talkRatiAndSentiment.length
    );

    const avgClientRatio = Math.round(
      evaluation.talkRatiAndSentiment.reduce(
        (acc, seg) => acc + seg.client,
        0
      ) / evaluation.talkRatiAndSentiment.length
    );

    const balance = Math.abs(avgSellerRatio - avgClientRatio);

    return [
      {
        label: "YOUR TALK",
        value: avgSellerRatio,
        color: "#007AFF",
        size: 200,
        current: avgSellerRatio,
        target: 40,
        unit: "%",
      },
      {
        label: "CLIENT TALK",
        value: avgClientRatio,
        color: "#34C759",
        size: 160,
        current: avgClientRatio,
        target: 60,
        unit: "%",
      },
      {
        label: "BALANCE",
        value: Math.max(0, 100 - balance * 2),
        color: "#FF9500",
        size: 120,
        current: balance,
        target: 20,
        unit: "DIFF",
      },
    ];
  };

  // Calculate sentiment activities for Apple Activity Card
  const getSentimentActivities = (): ActivityData[] => {
    if (
      !evaluation.talkRatiAndSentiment ||
      evaluation.talkRatiAndSentiment.length === 0
    ) {
      return [];
    }

    const avgSentiment = Math.round(
      evaluation.talkRatiAndSentiment.reduce(
        (acc, seg) => acc + getSentimentValue(seg),
        0
      ) / evaluation.talkRatiAndSentiment.length
    );

    const positiveSegments = evaluation.talkRatiAndSentiment.filter(
      (seg) => getSentimentValue(seg) >= 70
    ).length;
    const neutralSegments = evaluation.talkRatiAndSentiment.filter((seg) => {
      const val = getSentimentValue(seg);
      return val >= 40 && val < 70;
    }).length;
    const negativeSegments = evaluation.talkRatiAndSentiment.filter(
      (seg) => getSentimentValue(seg) < 40
    ).length;

    const positivePercentage = Math.round(
      (positiveSegments / evaluation.talkRatiAndSentiment.length) * 100
    );
    const neutralPercentage = Math.round(
      (neutralSegments / evaluation.talkRatiAndSentiment.length) * 100
    );

    return [
      {
        label: "POSITIVE",
        value: positivePercentage,
        color: "#34C759",
        size: 200,
        current: positiveSegments,
        target: evaluation.talkRatiAndSentiment.length,
        unit: "SEG",
      },
      {
        label: "NEUTRAL",
        value: neutralPercentage,
        color: "#FF9500",
        size: 160,
        current: neutralSegments,
        target: Math.ceil(evaluation.talkRatiAndSentiment.length / 2),
        unit: "SEG",
      },
      {
        label: "OVERALL",
        value: avgSentiment,
        color:
          avgSentiment >= 70
            ? "#34C759"
            : avgSentiment >= 50
            ? "#FF9500"
            : "#FF3B30",
        size: 120,
        current: avgSentiment,
        target: 80,
        unit: "%",
      },
    ];
  };

  // Empty state check
  if (Object.keys(evaluation).length === 0) {
    return (
      <Card className='p-8'>
        <div className='text-center text-muted-foreground'>
          <TrendingUp className='h-12 w-12 mx-auto mb-4 opacity-50' />
          <h3 className='font-medium mb-2'>No Evaluation Data</h3>
          <p className='text-sm'>
            The evaluation data is empty or could not be processed.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {sessionId && (
        <div className='text-sm text-muted-foreground'>
          Session ID: {sessionId}
        </div>
      )}

      <Tabs defaultValue='overview' className='w-full'>
        <TabsList className='grid w-full grid-cols-5'>
          <TabsTrigger value='overview' className='flex items-center gap-2'>
            <TrendingUp className='h-4 w-4' />
            Overview
          </TabsTrigger>
          <TabsTrigger value='talk-ratio' className='flex items-center gap-2'>
            <BarChart3 className='h-4 w-4' />
            Talk Ratio
          </TabsTrigger>
          <TabsTrigger value='sentiment' className='flex items-center gap-2'>
            <Heart className='h-4 w-4' />
            Sentiment
          </TabsTrigger>
          <TabsTrigger value='questions' className='flex items-center gap-2'>
            <MessageSquare className='h-4 w-4' />
            Questions
          </TabsTrigger>
          <TabsTrigger value='speech' className='flex items-center gap-2'>
            <Volume2 className='h-4 w-4' />
            Speech
          </TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='mt-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Strengths */}
            {evaluation.generalStrenghts &&
              evaluation.generalStrenghts.length > 0 && (
                <Card className='p-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <CheckCircle className='h-5 w-5 text-green-600' />
                    <h3 className='font-semibold text-green-700'>Strengths</h3>
                  </div>
                  <div className='space-y-2'>
                    {evaluation.generalStrenghts.map((strength, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-2 text-sm text-green-700'
                      >
                        <div className='w-2 h-2 bg-green-500 rounded-full flex-shrink-0' />
                        {strength}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            {/* Weaknesses */}
            {evaluation.generalWeaknesses &&
              evaluation.generalWeaknesses.length > 0 && (
                <Card className='p-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <AlertTriangle className='h-5 w-5 text-orange-600' />
                    <h3 className='font-semibold text-orange-700'>
                      Areas to Improve
                    </h3>
                  </div>
                  <div className='space-y-2'>
                    {evaluation.generalWeaknesses.map((weakness, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-2 text-sm text-orange-700'
                      >
                        <div className='w-2 h-2 bg-orange-500 rounded-full flex-shrink-0' />
                        {weakness}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            {/* Recommendations */}
            {evaluation.recommendations &&
              evaluation.recommendations.length > 0 && (
                <Card className='p-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <Target className='h-5 w-5 text-blue-600' />
                    <h3 className='font-semibold text-blue-700'>
                      Recommendations
                    </h3>
                  </div>
                  <div className='space-y-2'>
                    {evaluation.recommendations.map((recommendation, index) => (
                      <div
                        key={index}
                        className='flex items-start gap-2 text-sm text-blue-700'
                      >
                        <div className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2' />
                        <span>{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
          </div>
        </TabsContent>

        <TabsContent value='talk-ratio' className='mt-6'>
          {evaluation.talkRatiAndSentiment &&
          evaluation.talkRatiAndSentiment.length > 0 ? (
            <div className='space-y-6'>
              <AppleActivityCard
                title='Talk-to-Listen Ratio'
                className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950'
                activities={getTalkRatioActivities()}
              />

              <Card className='p-6'>
                <h3 className='font-semibold text-lg mb-4'>
                  Conversation Breakdown
                </h3>
                <div className='space-y-4'>
                  {evaluation.talkRatiAndSentiment.map((segment, index) => (
                    <div key={index} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium'>
                          Segment {index + 1} ({(index + 1) * 20 - 19}%-
                          {(index + 1) * 20}%)
                        </span>
                      </div>
                      <div className='flex items-center gap-4'>
                        <div className='flex-1'>
                          <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                            <span>You: {segment.seller}%</span>
                            <span>Client: {segment.client}%</span>
                          </div>
                          <div className='flex h-3 bg-gray-200 rounded-full overflow-hidden'>
                            <div
                              className='bg-blue-500'
                              style={{ width: `${segment.seller}%` }}
                            />
                            <div
                              className='bg-green-500'
                              style={{ width: `${segment.client}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className='p-8'>
              <div className='text-center text-muted-foreground'>
                <BarChart3 className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <h3 className='font-medium mb-2'>No Talk Ratio Data</h3>
                <p className='text-sm'>
                  Talk ratio data is not available for this conversation.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='sentiment' className='mt-6'>
          {evaluation.talkRatiAndSentiment &&
          evaluation.talkRatiAndSentiment.length > 0 ? (
            <div className='space-y-6'>
              <AppleActivityCard
                title='Client Sentiment Analysis'
                className='bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950'
                activities={getSentimentActivities()}
              />

              <Card className='p-6'>
                <h3 className='font-semibold text-lg mb-4'>
                  Sentiment Timeline
                </h3>
                <div className='space-y-4'>
                  {evaluation.talkRatiAndSentiment.map((segment, index) => {
                    const sentimentValue = getSentimentValue(segment);
                    return (
                      <div key={index} className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-medium'>
                            Segment {index + 1}
                          </span>
                          <Badge
                            variant='outline'
                            className={getSentimentColor(sentimentValue)}
                          >
                            {getSentimentLabel(sentimentValue)} (
                            {sentimentValue}%)
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ) : (
            <Card className='p-8'>
              <div className='text-center text-muted-foreground'>
                <Heart className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <h3 className='font-medium mb-2'>No Sentiment Data</h3>
                <p className='text-sm'>
                  Client sentiment data is not available for this conversation.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='questions' className='mt-6'>
          {(evaluation.goodQuestions && evaluation.goodQuestions.length > 0) ||
          (evaluation.badQuestions && evaluation.badQuestions.length > 0) ? (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* Good Questions */}
              {evaluation.goodQuestions &&
                evaluation.goodQuestions.length > 0 && (
                  <Card className='p-6'>
                    <div className='flex items-center gap-2 mb-4'>
                      <CheckCircle className='h-5 w-5 text-green-600' />
                      <h3 className='font-semibold text-green-700'>
                        Effective Questions
                      </h3>
                    </div>
                    <div className='space-y-3'>
                      {evaluation.goodQuestions.map((question, index) => (
                        <div
                          key={index}
                          className='p-3 bg-green-50 border border-green-200 rounded-md text-sm'
                        >
                          "{question}"
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

              {/* Bad Questions */}
              {evaluation.badQuestions &&
                evaluation.badQuestions.length > 0 && (
                  <Card className='p-6'>
                    <div className='flex items-center gap-2 mb-4'>
                      <XCircle className='h-5 w-5 text-red-600' />
                      <h3 className='font-semibold text-red-700'>
                        Questions to Avoid
                      </h3>
                    </div>
                    <div className='space-y-3'>
                      {evaluation.badQuestions.map((question, index) => (
                        <div
                          key={index}
                          className='p-3 bg-red-50 border border-red-200 rounded-md text-sm'
                        >
                          "{question}"
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
            </div>
          ) : (
            <Card className='p-8'>
              <div className='text-center text-muted-foreground'>
                <MessageSquare className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <h3 className='font-medium mb-2'>No Questions Identified</h3>
                <p className='text-sm'>
                  No specific questions were identified in this conversation.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='speech' className='mt-6'>
          {evaluation.fillerWords && evaluation.fillerWords.length > 0 ? (
            <Card className='p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <Volume2 className='h-5 w-5 text-orange-600' />
                <h3 className='font-semibold text-lg'>Speech Patterns</h3>
              </div>
              <div>
                <h4 className='font-medium text-orange-700 mb-3'>
                  Filler Words to Reduce
                </h4>
                <div className='flex flex-wrap gap-2 mb-4'>
                  {evaluation.fillerWords.map((word, index) => (
                    <Badge
                      key={index}
                      variant='outline'
                      className='text-orange-700 border-orange-300 bg-orange-50'
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
                <p className='text-sm text-muted-foreground'>
                  Try to reduce these filler words to sound more confident and
                  professional.
                </p>
              </div>
            </Card>
          ) : (
            <Card className='p-8'>
              <div className='text-center text-muted-foreground'>
                <Volume2 className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <h3 className='font-medium mb-2'>Clean Speech</h3>
                <p className='text-sm'>
                  No significant filler words were detected in your speech.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
