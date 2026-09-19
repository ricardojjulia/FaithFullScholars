'use client';

interface DoctrinalStatementFormProps {
  value: string;
  onChange: (value: string) => void;
}

const CLASSICAL_FRAMEWORK = `I believe in the plenary inspiration and absolute authority of the Holy Scriptures as the verbally inspired Word of God, without error in all that it affirms. I worship the one true and living God, eternally existing in three co-equal persons: Father, Son, and Holy Spirit. I affirm the full deity and true humanity of our Lord Jesus Christ, His virgin birth, sinless life, substitutionary atoning death on the cross, bodily resurrection, ascension to the right hand of the Father, and visible, personal return in power and glory. Salvation is by grace alone, through faith alone, in Christ alone, to the glory of God alone.`;

export function DoctrinalStatementForm({ value, onChange }: DoctrinalStatementFormProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Personal Theological & Doctrinal Statement
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Articulate your core biblical convictions. Institutional hiring committees review this for faculty alignment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(CLASSICAL_FRAMEWORK)}
          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Insert Baseline Framework
        </button>
      </div>

      <div className="relative">
        <textarea
          rows={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Articulate your convictions on the Scriptures, the Trinity, Christology, justification by faith, the Church, and Christian ministry..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed shadow-xs"
        />

        <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
          <span>Markdown formatting supported</span>
          <span>{wordCount} words</span>
        </div>
      </div>
    </div>
  );
}
