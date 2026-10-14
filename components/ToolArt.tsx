import Image from 'next/image';
import { isCrafterImage } from '@/lib/catalog-model';
export default function ToolArt({
  image = '',
  name = '',
  large = false,
}: {
  category?: string;
  image?: string;
  name?: string;
  large?: boolean;
}) {
  if (image)
    return (
      <div className={`tool-art uploaded ${large ? 'large' : ''}`}>
        <Image src={image} alt={name} fill unoptimized={isCrafterImage(image)} sizes={large ? "(max-width: 767px) 90vw, 550px" : "(max-width: 767px) 44vw, (max-width: 991px) 33vw, 280px"} loading={large ? 'eager' : 'lazy'} fetchPriority={large ? 'high' : 'auto'} />
      </div>
    );
  return (
    <div className={`tool-art ${large ? 'large' : ''}`}>
      <span>{name}</span>
    </div>
  );
}
