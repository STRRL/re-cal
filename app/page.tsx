"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast, Toaster } from "sonner"
import { Download } from "lucide-react"
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import WheelPicker from "@/components/ui/wheel-picker"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  timeDelay: z.string(),
})

type FormData = z.infer<typeof formSchema>

export default function Home() {
  const [selectedNumber, setSelectedNumber] = useState(1)
  const [selectedUnit, setSelectedUnit] = useState("weeks")
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      timeDelay: "1weeks",
    },
  })

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const units = [
    { label: "weeks", value: "weeks", fn: (num: number) => addWeeks(new Date(), num) },
    { label: "months", value: "months", fn: (num: number) => addMonths(new Date(), num) },
    { label: "years", value: "years", fn: (num: number) => addYears(new Date(), num) },
  ]

  const updateTimeDelay = (number: number, unit: string) => {
    form.setValue("timeDelay", `${number}${unit}`)
  }

  // Preview date for the current selection
  const selectedUnitObj = units.find((u) => u.value === selectedUnit)
  const previewDate = selectedUnitObj ? selectedUnitObj.fn(selectedNumber) : addWeeks(new Date(), selectedNumber)

  const generateICS = (data: FormData) => {
    const now = new Date()
    const uid = `${Date.now()}@recal.app`
    const dtstamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    
    // Parse the time delay (e.g., "3weeks", "2months")
    const match = data.timeDelay.match(/(\d+)(\w+)/)
    const number = match ? parseInt(match[1]) : 1
    const unit = match ? match[2] : "weeks"
    
    const selectedUnit = units.find(u => u.value === unit)
    const startDate = selectedUnit ? selectedUnit.fn(number) : addWeeks(new Date(), 1)
    const endDate = new Date(startDate.getTime() + 30 * 60000) // 30 minutes duration
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      const seconds = String(date.getSeconds()).padStart(2, "0")
      return `${year}${month}${day}T${hours}${minutes}${seconds}`
    }
    
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ReCal//ReCal 1.0//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${data.title}`,
      `DESCRIPTION:${data.content.replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ]
    
    return icsContent.join("\r\n")
  }

  const onSubmit = (data: FormData) => {
    const icsContent = generateICS(data)
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `recal-${data.title.toLowerCase().slice(0, 30).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success("Calendar reminder created!")
  }

  const scrollToGenerator = () => {
    document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <Toaster position="bottom-center" />
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">ReCal</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={scrollToGenerator}
            >
              Create Reminder
            </Button>
          </div>
        </header>

        {/* Main two-column layout */}
        <section className="mx-auto max-w-5xl px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Hero copy */}
            <div className="text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
                Capture a thought now.
                <br className="hidden md:block" />
                Revisit it when it matters.
              </h2>
              <p className="text-base md:text-lg text-gray-600 mb-2 md:mb-4 max-w-xl">
                Turn your hot takes, fact checks, and second thoughts into calendar reminders.
                Because some perspectives need time to mature.
              </p>
            </div>

            {/* Right: Generator Card */}
            <section id="generator" className="w-full max-w-md md:justify-self-end">
              <Card className="rounded-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle>Create Your Reminder</CardTitle>
                  <CardDescription>
                    What do you want to revisit, and when?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    {/* Title Field */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Title, e.g., Revisit this decision"
                              className="text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Content Field */}
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder={"Content or context, e.g.:\n- Capture current thoughts and reasons\n- Hypotheses/checklist to validate\n- Links to sources to revisit"}
                              rows={5}
                              className="resize-none text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Time Selection */}
                    <div className="space-y-3">
                      <p className="text-base font-semibold">Remind me...</p>
                      
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex flex-col gap-6">
                          {/* iOS-style wheel pickers */}
                          <div className="flex gap-4 justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-2">How many</p>
                              <WheelPicker
                                options={numbers.map((n) => ({ label: String(n), value: n }))}
                                selectedIndex={numbers.indexOf(selectedNumber)}
                                onChange={(idx) => {
                                  const num = numbers[idx] ?? 1
                                  setSelectedNumber(num)
                                  updateTimeDelay(num, selectedUnit)
                                }}
                                itemHeight={32}
                                visibleCount={3}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-2">Time unit</p>
                              <WheelPicker
                                options={units.map((u) => ({ label: u.label, value: u.value }))}
                                selectedIndex={units.findIndex((u) => u.value === selectedUnit)}
                                onChange={(idx) => {
                                  const u = units[idx] ?? units[0]
                                  setSelectedUnit(u.value)
                                  updateTimeDelay(selectedNumber, u.value)
                                }}
                                itemHeight={32}
                                visibleCount={3}
                              />
                            </div>
                          </div>
                          
                          {/* Current Selection */}
                          <div className="mt-1 pt-2 border-t text-center">
                            <span className="text-lg font-medium">
                              {selectedNumber} {selectedUnit} later
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>


                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full bg-black text-white hover:bg-gray-800"
                      size="default"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Create Reminder
                    </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </section>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t mt-4">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} ReCal. Helping you think twice.
          </div>
        </footer>
      </div>
    </>
  )
}
