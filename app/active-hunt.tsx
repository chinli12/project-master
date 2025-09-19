import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CheckCircle, Circle, Award } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Progress from 'react-native-progress';

// Type for a single scavenger hunt
interface ScavengerHunt {
  id: string;
  name: string;
  description: string;
  icon: 'Compass' | 'Camera' | 'MapPin';
  image: string;
}

// Type for a single task
interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const ActiveHuntScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const hunt: ScavengerHunt | null = params.hunt ? JSON.parse(params.hunt as string) : null;

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Find the Grand Fountain', completed: false },
    { id: '2', text: 'Take a picture of the oldest statue', completed: false },
    { id: '3', text: 'Visit the City Hall', completed: false },
    { id: '4', text: 'Find a street performer', completed: false },
    { id: '5', text: 'Locate the hidden mural', completed: false },
  ]);
  const [huntCompleted, setHuntCompleted] = useState(false);

  const progress = tasks.filter(t => t.completed).length / tasks.length;

  const toggleTask = (id: string) => {
    if (huntCompleted) return;
    setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const completeHunt = async () => {
    if (!user || !hunt) return;

    setHuntCompleted(true);

    try {
      // Assume a badge exists for completing a scavenger hunt
      const badgeId = 'scavenger-master'; // This should be a real ID from your badges table
      
      const { error } = await supabase
        .from('user_badges')
        .insert({ user_id: user.id, badge_id: badgeId });

      if (error) {
        // It's possible the user already has the badge, so we can ignore duplicate errors
        if (error.code !== '23505') {
          throw error;
        }
      }

      Alert.alert(
        'Hunt Complete!',
        `Congratulations! You've earned the "${hunt.name}" badge!`,
        [{ text: 'Awesome!', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error awarding badge:', error);
      Alert.alert('Error', 'There was an issue awarding your badge.');
    }
  };

  useEffect(() => {
    if (progress === 1 && !huntCompleted) {
      completeHunt();
    }
  }, [progress]);

  if (!hunt) {
    return (
      <View style={styles.container}>
        <Text>No hunt data provided.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={{ uri: hunt.image }} style={styles.headerImage}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.headerOverlay}
        >
          <SafeAreaView>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
      
      <ScrollView style={styles.contentContainer}>
        <Text style={styles.title}>{hunt.name}</Text>
        <Text style={styles.description}>Complete all the tasks to finish the hunt.</Text>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progress: {Math.round(progress * 100)}%
          </Text>
          <Progress.Bar progress={progress} width={null} color="#4F46E5" unfilledColor="#E5E7EB" borderWidth={0} />
        </View>

        <View style={styles.tasksContainer}>
          <Text style={styles.tasksTitle}>Your Mission</Text>
          {tasks.map(task => (
            <TouchableOpacity key={task.id} style={styles.taskItem} onPress={() => toggleTask(task.id)}>
              {task.completed ? (
                <CheckCircle size={24} color="#22C55E" />
              ) : (
                <Circle size={24} color="#9CA3AF" />
              )}
              <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                {task.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {huntCompleted && (
        <View style={styles.footer}>
          <View style={styles.completedContainer}>
            <Award size={24} color="#22C55E" />
            <Text style={styles.completedText}>Hunt Completed!</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerImage: {
    height: 300,
    justifyContent: 'flex-start',
  },
  headerOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    marginTop: -40,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  tasksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  tasksTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  taskText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 16,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  completedText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#22C55E',
    marginLeft: 12,
  },
});

export default ActiveHuntScreen;
