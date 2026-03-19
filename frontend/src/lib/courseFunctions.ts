import { supabase } from './supabase';

export interface CourseProgress {
  user_id: string;
  course_id: string;
  progress_percentage: number;
  status: 'in_progress' | 'completed';
  updated_at: string;
}

/**
 * Get progress for all courses for a specific user.
 */
export async function getUserCourseProgress(userId: string): Promise<CourseProgress[]> {
  const { data, error } = await supabase
    .from('user_course_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching course progress:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get progress for a specific course for a specific user.
 */
export async function getSingleCourseProgress(userId: string, courseId: string): Promise<CourseProgress | null> {
  const { data, error } = await supabase
    .from('user_course_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (error && error.code !== 'PGRST116') { // not found is OK
    console.error('Error fetching single course progress:', error);
    throw error;
  }

  return data || null;
}

/**
 * Upsert the progress for a specific course.
 */
export async function updateCourseProgress(
  userId: string,
  courseId: string,
  progressPercentage: number,
  status: 'in_progress' | 'completed' = 'in_progress'
): Promise<void> {
  const { error } = await supabase
    .from('user_course_progress')
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        progress_percentage: progressPercentage,
        status: status,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,course_id' }
    );

  if (error) {
    console.error('Error updating course progress:', error);
    throw error;
  }
}
