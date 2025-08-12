"use client";
import { authClient } from "@/lib/auth-client";
import { AgentFeed } from "@/components/agent-feed";
import { Bot, Calendar, Phone, BarChart, History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) {
    return <div>Loading...</div>;
  }
  if (!session) {
    return <div>Not logged in</div>;
  }
  return (
    <div className='container mx-auto max-w-6xl px-4 py-6'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <div className='space-y-6'>
            <div>
              <h1 className='text-3xl font-bold'>Dashboard</h1>
              <p className='text-muted-foreground'>
                Welcome back, {session?.user.name}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Get started with your interview practice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors'>
                    <h3 className='font-semibold mb-2'>Start Pre-Call</h3>
                    <p className='text-sm text-muted-foreground'>
                      Configure AI and prepare for your call
                    </p>
                  </div>
                  <div className='p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors'>
                    <h3 className='font-semibold mb-2'>Live Recording</h3>
                    <p className='text-sm text-muted-foreground'>
                      Start a new recording session
                    </p>
                  </div>
                  <div className='p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors'>
                    <h3 className='font-semibold mb-2'>View History</h3>
                    <p className='text-sm text-muted-foreground'>
                      Review past sessions and progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className='lg:col-span-1'>
          <div className='sticky top-6'>
            <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
              <Bot className='h-5 w-5' />
              Agent Feed
            </h2>
            <AgentFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
