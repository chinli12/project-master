import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CheckCircle, Circle } from 'lucide-react-native';
import { Alert } from 'react-native';

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

const ScavengerDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hunt: ScavengerHunt | null = params.hunt ? JSON.parse(params.hunt as string) : null;

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Find the Grand Fountain', completed: false },
    { id: '2', text: 'Take a picture of the oldest statue', completed: false },
    { id: '3', text: 'Visit the City Hall', completed: false },
    { id: '4', text: 'Find a street performer', completed: false },
    { id: '5', text: 'Locate the hidden mural', completed: false },
  ]);

    const toggleTask = (id: string) => {
        setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

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
        <Text style={styles.description}>{hunt.description}</Text>

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

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={() => router.push({ pathname: '/active-hunt', params: { hunt: JSON.stringify(hunt) } })}>
          <Text style={styles.startButtonText}>Start Hunt</Text>
        </TouchableOpacity>
      </View>
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
  startButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});

export default ScavengerDetailsScreen;
