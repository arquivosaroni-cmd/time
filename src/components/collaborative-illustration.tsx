import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function CollaborativeIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Image
        src="/time.svg"
        alt="Ilustração de gerenciamento de tempo e colaboração"
        width={400}
        height={300}
        className="mx-auto"
        priority
      />
    </div>
  );
}
