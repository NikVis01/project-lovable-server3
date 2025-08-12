import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <div className='w-8 h-8 bg-primary rounded p-1 flex items-center justify-center'>
        <Image
          src={"/logo.svg"}
          alt='logo'
          className='w-8 h-8'
          width={32}
          height={32}
        />
      </div>
      <span className='text-xl font-bold text-gray-900 dark:text-white'>
        Tone
      </span>
    </div>
  );
}
