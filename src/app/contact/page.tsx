"use client";

import { useState } from "react";
import { Mail, Send, MapPin } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { APP } from "@/config/app";
import toast from "react-hot-toast";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    // Opens mail client with pre-filled message
    const subject = encodeURIComponent(`${APP.name} — Contact from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${APP.supportEmail}?subject=${subject}&body=${body}`;
    toast.success("Opening your email client...");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <PublicHeader />
      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Contact Us</h1>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto">
              Questions about integration, API keys, or enterprise plans? We&apos;re here to help.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Card className="flex items-start gap-4">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Email</h3>
                  <a
                    href={`mailto:${APP.supportEmail}`}
                    className="text-sm text-violet-600 hover:text-violet-800 mt-1 block"
                  >
                    {APP.supportEmail}
                  </a>
                </div>
              </Card>
              <Card className="flex items-start gap-4">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Documentation</h3>
                  <a href="/docs" className="text-sm text-violet-600 hover:text-violet-800 mt-1 block">
                    Read API docs →
                  </a>
                </div>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
                <Textarea
                  label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={5}
                  required
                />
                <Button type="submit" loading={sending} className="gap-2">
                  <Send className="w-4 h-4" /> Send Message
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
