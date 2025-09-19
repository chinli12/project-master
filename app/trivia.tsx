import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface TriviaQuestion {
  question: string;
  options: string[];
  answer: string;
}

const mockTrivia: { [key: string]: TriviaQuestion[] } = {
  'ChIJj61dQgK6j4AR4GeTYWZsKWw': [
    {
      question: 'What year was the Googleplex opened?',
      options: ['1999', '2004', '2008', '2012'],
      answer: '2004',
    },
  ],
};

export default function TriviaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
    const [questions, setQuestions] = useState<TriviaQuestion[]>(mockTrivia[id as string] || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const handleAnswer = (option: string) => {
    if (option === questions[currentQuestionIndex].answer) {
      setScore(score + 1);
    }
    const nextQuestionIndex = currentQuestionIndex + 1;
    if (nextQuestionIndex < questions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
    } else {
      Alert.alert('Trivia Complete', `You scored ${score + 1} out of ${questions.length}!`);
      router.back();
    }
  };

  return (
    <LinearGradient
      colors={['#2c3e50', '#3498db']}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Trivia</Text>
        </View>
        <View style={styles.content}>
          {questions.length > 0 && (
            <>
              <Text style={styles.question}>{questions[currentQuestionIndex].question}</Text>
              {questions[currentQuestionIndex].options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => handleAnswer(option)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  question: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
