import { ConfirmModal, TextField, ToggleField } from 'millennium';
import { useState } from 'react';
import { Localize, useLanguage, type LocalizationKey } from '../services/localization';
import type { AnyButton, Flag } from '../types';

// One editable field of a button. Which fields a button has depends on its section.
export type ButtonField =
	| { kind: 'text'; key: string; labelKey: LocalizationKey; descriptionKey: LocalizationKey }
	| { kind: 'toggle'; key: string; labelKey: LocalizationKey; descriptionKey: LocalizationKey };

type Props<T extends AnyButton> = {
	title: string;
	button: T;
	fields: ButtonField[];
	onSave: (button: T) => void;
	closeModal?: () => void;
};

// Edits a copy of the button: nothing is changed until the user presses Save.
export function EditButtonModal<T extends AnyButton>({ title, button, fields, onSave, closeModal }: Props<T>) {
	const language = useLanguage();
	const [draft, setDraft] = useState<T>(button);

	const values = draft as unknown as Record<string, string>;
	const setValue = (key: string, value: string) => setDraft((previous) => ({ ...previous, [key]: value }));

	return (
		<ConfirmModal
			strTitle={title}
			strOKButtonText={Localize(language, 'Save')}
			strCancelButtonText={Localize(language, 'Cancel')}
			onOK={() => onSave(draft)}
			onCancel={closeModal}
			closeModal={closeModal}
		>
			<ToggleField
				label={Localize(language, 'EnableButton')}
				description={Localize(language, 'EnableButtonTip')}
				checked={values.enabled !== 'false'}
				onChange={(checked) => setValue('enabled', String(checked) as Flag)}
			/>
			{fields.map((field) =>
				field.kind === 'text' ? (
					<TextField
						key={field.key}
						label={Localize(language, field.labelKey)}
						description={Localize(language, field.descriptionKey)}
						value={values[field.key] ?? ''}
						onChange={(event) => setValue(field.key, event.target.value)}
					/>
				) : (
					<ToggleField
						key={field.key}
						label={Localize(language, field.labelKey)}
						description={Localize(language, field.descriptionKey)}
						checked={values[field.key] === 'true'}
						onChange={(checked) => setValue(field.key, String(checked) as Flag)}
					/>
				),
			)}
		</ConfirmModal>
	);
}
