import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/index.js';
import { reviewApi } from '../../services/index.js';
import { pushToast } from '../../store/toastSlice.js';
import { Button, Input, Textarea } from '../common/UI.jsx';

const schema = z.object({
  rating: z.coerce.number().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(5).max(2000),
});

export default function ReviewForm({ bookId, onDone }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [rating, setRating] = useState(5);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), defaultValues: { rating: 5 },
  });

  const submit = async (values) => {
    try {
      await reviewApi.create(bookId, { ...values, rating });
      dispatch(pushToast(t('toast.reviewSubmitted')));
      onDone?.();
    } catch (error) {
      dispatch(pushToast(error.response?.data?.error?.message || t('toast.error'), 'error'));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="mb-8 rounded-lg border border-line bg-white p-5">
      <h3 className="mb-4 font-serif text-xl">{t('book.addReview')}</h3>
      <div className="mb-4">
        <label className="label">{t('book.yourRating')}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-gold' : 'text-line'}`}>★</button>
          ))}
        </div>
      </div>
      <Input label={t('book.reviewTitle')} {...register('title')} error={errors.title?.message} />
      <Textarea label={t('book.yourReview')} className="mt-4" {...register('comment')} error={errors.comment?.message} />
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('book.submitReview')}</Button>
      </div>
    </form>
  );
}
