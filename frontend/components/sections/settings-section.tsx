"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Settings, User, Bell, Palette, Shield, Download, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function SettingsSection() {
  const [notifications, setNotifications] = useState({
    studyReminders: true,
    quizResults: true,
    weeklyReport: false,
    newFeatures: true,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-neon-cyan" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center text-2xl font-bold text-white">
                JS
              </div>
              <Button variant="outline" className="border-border/50 hover:border-neon-cyan/50">
                Change Avatar
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input 
                defaultValue="John Student" 
                className="bg-muted/30 border-border/50 focus:border-neon-cyan/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                defaultValue="john@example.com" 
                type="email"
                className="bg-muted/30 border-border/50 focus:border-neon-cyan/50"
              />
            </div>

            <Button className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90 text-white">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-neon-cyan" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { key: "studyReminders", label: "Study Reminders", description: "Get reminded to study daily" },
              { key: "quizResults", label: "Quiz Results", description: "Notifications for quiz completions" },
              { key: "weeklyReport", label: "Weekly Report", description: "Receive weekly progress summary" },
              { key: "newFeatures", label: "New Features", description: "Updates about new features" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={notifications[item.key as keyof typeof notifications]}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-neon-cyan" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-3 block">Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {["Dark", "Light", "System"].map((theme) => (
                  <Button
                    key={theme}
                    variant="outline"
                    className={`${
                      theme === "Dark"
                        ? "border-neon-cyan bg-neon-cyan/10"
                        : "border-border/50"
                    }`}
                  >
                    {theme}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="mb-3 block">Accent Color</Label>
              <div className="flex gap-3">
                {[
                  { color: "bg-cyan-500", name: "Cyan" },
                  { color: "bg-purple-500", name: "Purple" },
                  { color: "bg-green-500", name: "Green" },
                  { color: "bg-orange-500", name: "Orange" },
                ].map((accent) => (
                  <button
                    key={accent.name}
                    className={`w-8 h-8 rounded-full ${accent.color} ${
                      accent.name === "Cyan" ? "ring-2 ring-offset-2 ring-offset-background ring-neon-cyan" : ""
                    }`}
                    title={accent.name}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-neon-cyan" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start border-border/50 hover:border-neon-cyan/50">
              <Shield className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start border-border/50 hover:border-neon-cyan/50">
              <Download className="w-4 h-4 mr-2" />
              Export Your Data
            </Button>
            <Button variant="outline" className="w-full justify-start border-red-500/30 hover:bg-red-500/10 text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
