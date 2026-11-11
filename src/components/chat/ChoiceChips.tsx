'use client';

import { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import TextInput from './TextInput';

interface Choice {
    id: string;
    label: string;
    type?: 'text' | 'choice';
    isOther?: boolean;
}

interface ChoiceChipsProps {
    choices: Choice[];
    onSelect: (choice: any) => void;
    onTextSubmit: (text: string) => void;
    disabled?: boolean;
}

export default function ChoiceChips({ choices, onSelect, onTextSubmit, disabled }: ChoiceChipsProps) {
    const [selectedTextChoice, setSelectedTextChoice] = useState<Choice | null>(null);

    const handleChoiceClick = (choice: Choice) => {
        if (disabled) return;
        if (choice.type === 'text' || choice.isOther) {
            setSelectedTextChoice(choice);
        } else {
            onSelect(choice);
        }
    };

    if (selectedTextChoice) {
        return (
            <TextInput
                placeholder={`${selectedTextChoice.label} 입력...`}
                onSubmit={(text) => {
                    onTextSubmit(text);
                    setSelectedTextChoice(null);
                }}
                onCancel={() => setSelectedTextChoice(null)}
                disabled={disabled}
            />
        );
    }

    return (
        <div className="flex flex-wrap gap-2 justify-center items-center">
            {choices.map((choice) => (
                <button
                    key={choice.id}
                    onClick={() => handleChoiceClick(choice)}
                    disabled={disabled}
                    className="group relative flex items-center gap-3 md:gap-4 px-6 py-4 md:px-8 md:py-5 rounded-[4px] bg-bg-elevated border border-border hover:border-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {choice.type === 'text' && <Sparkles size={18} className="text-accent" />}
                    <span className="text-base md:text-lg font-bold text-text-secondary group-hover:text-accent transition-colors">
                        {choice.label}
                    </span>
                    <ChevronRight size={18} className="text-text-muted group-hover:text-text-secondary transition-colors" />
                </button>
            ))}
        </div>
    );
}
