import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { name: "Features", href: "#link" },
  { name: "Solution", href: "#link" },
  { name: "Pricing", href: "#link" },
  { name: "About", href: "#link" },
];

export function Navbar() {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  // Replacing Supabase user session with dummy data
  const user = {
    id: "dummy-id",
    email: "dummy@example.com",
    user_metadata: {
      full_name: "Dummy User",
      avatar_url: "https://example.com/dummy-avatar.png",
    },
  };
  const router = useRouter();

  const handleLogout = async () => {
    console.log("Logging out");
  };

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className='fixed z-20 w-full px-2 group'
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5"
          )}
        >
          <div className='relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4'>
            <div className='flex w-full justify-between lg:w-auto'>
              <Link
                to='/'
                aria-label='home'
                className='flex items-center space-x-2'
              >
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? "Close Menu" : "Open Menu"}
                className='relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden'
              >
                <Menu className='in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200' />
                <X className='group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200' />
              </button>
            </div>

            <div className='absolute inset-0 m-auto hidden size-fit lg:block'>
              <ul className='flex gap-8 text-sm'>
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className='text-muted-foreground hover:text-accent-foreground block duration-150'
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className='bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent'>
              <div className='lg:hidden'>
                <ul className='space-y-6 text-base'>
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className='text-muted-foreground hover:text-accent-foreground block duration-150'
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className='flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit'>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        className='relative h-8 w-8 rounded-full'
                      >
                        <Avatar className='h-8 w-8'>
                          <AvatarImage
                            src={user.user_metadata?.avatar_url || ""}
                            alt={
                              user.user_metadata?.full_name ||
                              user.email ||
                              "User"
                            }
                          />
                          <AvatarFallback>
                            {user.user_metadata?.full_name
                              ? user.user_metadata.full_name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : user.email?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className='w-56'
                      align='end'
                      forceMount
                    >
                      <div className='flex items-center justify-start gap-2 p-2'>
                        <div className='flex flex-col space-y-1 leading-none'>
                          {user.user_metadata?.full_name && (
                            <p className='font-medium'>
                              {user.user_metadata.full_name}
                            </p>
                          )}
                          {user.email && (
                            <p className='w-[200px] truncate text-sm text-muted-foreground'>
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href='/dashboard'>Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='text-red-600 cursor-pointer'
                        onClick={handleLogout}
                      >
                        <LogOut className='mr-2 h-4 w-4' />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button
                      asChild
                      variant='outline'
                      size='sm'
                      className={cn(isScrolled && "lg:hidden")}
                    >
                      <Link href='/login'>
                        <span>Login</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size='sm'
                      className={cn(isScrolled && "lg:hidden")}
                    >
                      <Link href='#'>
                        <span>Sign Up</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size='sm'
                      className={cn(isScrolled ? "lg:inline-flex" : "hidden")}
                    >
                      <Link href='#'>
                        <span>Get Started</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <div className='w-8 h-8 bg-primary rounded p-1 flex items-center justify-center'>
        <img src={"/logo.svg"} alt='logo' className='w-8 h-8' />
      </div>
      <span className='text-xl font-bold text-gray-900 dark:text-white'>
        Tone
      </span>
    </div>
  );
};
