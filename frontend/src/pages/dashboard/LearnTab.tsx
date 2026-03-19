import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, Clock, ChevronRight } from 'lucide-react';

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

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COURSES.map((course, idx) => (
          <div
            key={course.id}
            onClick={() => course.available && navigate(`/learn/${course.id}`)}
            className={`relative flex flex-col rounded-xl border bg-white p-5 transition-all ${
              course.available
                ? 'border-[#e8e8e8] hover:border-[#111] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer group'
                : 'border-[#e8e8e8] opacity-60 cursor-not-allowed select-none bg-[#faf9f5]'
            }`}
          >
            {/* Course number */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
                Course {idx + 1}
              </span>
              {course.available ? null : (
                <Lock size={13} className="text-[#888]" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-[13px] font-semibold text-[#111] leading-tight mb-2 flex-1">
              {course.title}
            </h3>

            {/* Description */}
            <p className="text-[12px] text-[#666] leading-relaxed mb-6">
              {course.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e8e8e8]">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md border ${difficultyColors[course.difficulty]}`}>
                  {course.difficulty}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#888]">
                  <Clock size={12} />
                  {course.estimatedMinutes}m
                </span>
              </div>
              {course.available && (
                <ChevronRight size={14} className="text-[#888] group-hover:text-[#111] transition-colors" />
              )}
              {!course.available && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#888]">Coming soon</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
