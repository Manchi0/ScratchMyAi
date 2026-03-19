import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock } from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { getUserCourseProgress, type CourseProgress } from '@/lib/courseFunctions';

interface CourseCard {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  available: boolean;
}

const COURSES: CourseCard[] = [
  {
    id: 'mlp-intro',
    title: 'Using AI-Blocks to Make Your First MLP',
    description: 'Build a Multi-Layer Perceptron from scratch and train it on handwritten digits.',
    difficulty: 'Beginner',
    estimatedMinutes: 20,
    available: true,
  },
  {
    id: 'simple-cnn-mnist',
    title: 'Simple CNN with MNIST',
    description: 'Learn convolutional layers by building an image classifier that outperforms the MLP.',
    difficulty: 'Beginner',
    estimatedMinutes: 25,
    available: true,
  },
  {
    id: 'what-is-rnn',
    title: 'What Is a RNN?',
    description: 'Understand recurrent neural networks and how they process sequential data.',
    difficulty: 'Intermediate',
    estimatedMinutes: 20,
    available: true,
  },
  {
    id: 'making-lstms',
    title: 'Making LSTMs Using RNNs',
    description: 'Build Long Short-Term Memory networks to handle longer-range dependencies.',
    difficulty: 'Intermediate',
    estimatedMinutes: 30,
    available: true,
  },
  {
    id: 'first-transformer',
    title: 'Making Your First Transformer',
    description: 'Assemble an attention-based transformer architecture block by block.',
    difficulty: 'Advanced',
    estimatedMinutes: 45,
    available: true,
  },
];

const difficultyColors: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function LearnTab() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [progressData, setProgressData] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    if (user) {
      getUserCourseProgress(user.id).then((data) => {
        const map: Record<string, CourseProgress> = {};
        for (const pt of data) {
           map[pt.course_id] = pt;
        }
        setProgressData(map);
      }).catch(console.error);
    }
  }, [user]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COURSES.map((course, idx) => {
          const prog = progressData[course.id];
          const hasStarted = !!prog;
          const status = prog?.status || 'in_progress';
          const pct = prog?.progress_percentage || 0;

          return (
            <div
              key={course.id}
            onClick={() => course.available && navigate(`/learn/${course.id}`)}
            className={`relative flex flex-col rounded-xl border bg-white p-5 transition-all ${
              course.available
                ? 'border-[#e8e8e8] hover:border-[#111] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer group'
                : 'border-[#e8e8e8] opacity-60 cursor-not-allowed select-none bg-[#faf9f5]'
            }`}
          >
            {/* Course number & Difficulty */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
                Course {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md border ${difficultyColors[course.difficulty]}`}>
                  {course.difficulty}
                </span>
                {!course.available && <Lock size={13} className="text-[#888]" />}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[13px] font-semibold text-[#111] leading-tight mb-2 flex-1">
              {course.title}
            </h3>

            {/* Description */}
            <p className="text-[12px] text-[#666] leading-relaxed mb-6">
              {course.description}
            </p>



            {/* Footer / Progress */}
            <div className="mt-auto pt-4 border-t border-[#f0f0f0]">
              {course.available ? (
                <div className="w-full flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
                      {status === 'completed' ? 'Completed' : 'Progress'}
                    </span>
                    <span className="text-[10px] font-bold text-[#111]">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ease-out rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#888]">Coming soon</span>
                  <Lock size={12} className="text-[#aaa]" />
                </div>
              )}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
