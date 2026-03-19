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
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-1">Learning ML</h2>
        <p className="text-sm text-stone-500">
          Step-by-step courses that guide you through building neural networks with AI-Blocks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COURSES.map((course, idx) => (
          <div
            key={course.id}
            onClick={() => course.available && navigate(`/learn/${course.id}`)}
            className={`relative flex flex-col rounded-xl border bg-white p-5 transition-all ${
              course.available
                ? 'border-stone-200 hover:border-indigo-300 hover:shadow-md cursor-pointer group'
                : 'border-stone-100 opacity-60 cursor-not-allowed select-none'
            }`}
          >
            {/* Course number */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Course {idx + 1}
              </span>
              {course.available ? (
                <div className="flex items-center gap-1 text-indigo-600">
                  <BookOpen size={14} />
                </div>
              ) : (
                <Lock size={13} className="text-stone-300" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-neutral-800 leading-snug mb-2 flex-1">
              {course.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              {course.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${difficultyColors[course.difficulty]}`}>
                  {course.difficulty}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-stone-400">
                  <Clock size={10} />
                  {course.estimatedMinutes} min
                </span>
              </div>
              {course.available && (
                <ChevronRight size={14} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
              )}
              {!course.available && (
                <span className="text-[10px] text-stone-400">Coming soon</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
