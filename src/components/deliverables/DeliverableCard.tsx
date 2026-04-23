'use client';

import type {
  AwardDetails,
  BusinessCardDetails,
  Deliverable,
  DeliverableCategory,
  OtherDetails,
  PosterPopDetails,
  Store,
} from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';
import PosterPopForm from './PosterPopForm';
import BusinessCardForm from './BusinessCardForm';
import AwardForm from './AwardForm';
import OtherForm from './OtherForm';

type Props = {
  deliverable: Deliverable;
  index: number;
  stores: Store[];
  onUpdate: (patch: Partial<Deliverable>) => void;
  onUpdateDetails: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export default function DeliverableCard({
  deliverable,
  index,
  stores,
  onUpdate: _onUpdate,
  onUpdateDetails,
  onRemove,
  canRemove,
}: Props) {
  const { category, details } = deliverable;
  void _onUpdate;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}
          >
            #{index + 1} {CATEGORY_LABELS[category]}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
            aria-label="削除"
          >
            削除
          </button>
        )}
      </div>

      {(category === 'poster' || category === 'pop') && (
        <PosterPopForm
          category={category}
          value={details as PosterPopDetails}
          onChange={onUpdateDetails}
        />
      )}
      {category === 'businessCard' && (
        <BusinessCardForm
          value={details as BusinessCardDetails}
          onChange={onUpdateDetails}
          stores={stores}
        />
      )}
      {category === 'award' && (
        <AwardForm value={details as AwardDetails} onChange={onUpdateDetails} />
      )}
      {category === 'other' && (
        <OtherForm value={details as OtherDetails} onChange={onUpdateDetails} />
      )}
    </div>
  );
}

export { type DeliverableCategory };
