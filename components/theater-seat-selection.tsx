"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Check, X, ChevronRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"

// Define seat status types
type SeatStatus = "available" | "occupied" | "selected" | "suggested"

// Define seat interface
interface Seat {
  id: string
  row: string
  number: number
  status: SeatStatus
  numericId: number // Para el algoritmo de sugerencia
}

// Configuración del teatro
const THEATER_CONFIG = {
  ticketPrice: 5000, // ₡5,000 colones
  serviceFee: 750, // ₡750 colones
  rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
  centerRow: "D", // Fila central para el algoritmo de sugerencia
}

// Función para formatear moneda en colones
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
  }).format(amount)
}

// Generate theater seats
const generateSeats = (): Seat[] => {
  const seats: Seat[] = []
  let idCounter = 1

  THEATER_CONFIG.rows.forEach((row) => {
    const seatsPerRow = row === "A" || row === "H" ? 10 : 12

    for (let i = 1; i <= seatsPerRow; i++) {
      // Randomly mark some seats as occupied
      const status = Math.random() > 0.7 ? "occupied" : "available"
      seats.push({
        id: `${row}${i}`,
        row,
        number: i,
        status,
        numericId: idCounter++,
      })
    }
  })

  return seats
}

// Función para sugerir asientos
const suggestSeats = (seats: Seat[], requestedSeats: number): Set<string> => {
  if (requestedSeats <= 0) return new Set()

  // Ordenar filas por cercanía al centro
  const rowsOrderedByProximityToCenter = [...THEATER_CONFIG.rows].sort((a, b) => {
    const aIndex = THEATER_CONFIG.rows.indexOf(a)
    const bIndex = THEATER_CONFIG.rows.indexOf(b)
    const centerIndex = THEATER_CONFIG.rows.indexOf(THEATER_CONFIG.centerRow)

    return Math.abs(aIndex - centerIndex) - Math.abs(bIndex - centerIndex)
  })

  // Para cada fila, buscar asientos consecutivos disponibles
  for (const row of rowsOrderedByProximityToCenter) {
    const seatsInRow = seats.filter((seat) => seat.row === row && seat.status === "available")
    seatsInRow.sort((a, b) => a.number - b.number)

    // Buscar secuencias de asientos disponibles
    let currentSequence: Seat[] = []
    let bestSequence: Seat[] = []

    for (let i = 0; i < seatsInRow.length; i++) {
      const currentSeat = seatsInRow[i]

      if (i > 0 && seatsInRow[i - 1].number === currentSeat.number - 1) {
        // Asiento consecutivo
        currentSequence.push(currentSeat)
      } else {
        // Nuevo inicio de secuencia
        currentSequence = [currentSeat]
      }

      // Verificar si la secuencia actual es mejor que la mejor encontrada
      if (
        currentSequence.length >= requestedSeats &&
        (bestSequence.length === 0 || currentSequence.length < bestSequence.length)
      ) {
        bestSequence = [...currentSequence]
      }
    }

    // Si encontramos suficientes asientos consecutivos, devolver los primeros requestedSeats
    if (bestSequence.length >= requestedSeats) {
      return new Set(bestSequence.slice(0, requestedSeats).map((seat) => seat.id))
    }
  }

  // No se encontraron suficientes asientos consecutivos
  return new Set()
}

export default function TheaterSeatSelection() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [ticketCount, setTicketCount] = useState<number>(1)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [suggestedSeats, setSuggestedSeats] = useState<Set<string>>(new Set())

  // Inicializar asientos
  useEffect(() => {
    if (seats.length === 0) {
      setSeats(generateSeats())
    }
  }, [seats.length])

  // Sugerir asientos cuando cambia el número de tickets
  useEffect(() => {
    if (ticketCount > 0 && seats.length > 0) {
      const availableSeats = seats.map((seat) =>
        seat.status === "suggested" ? { ...seat, status: "available" as SeatStatus } : seat,
      )

      const suggestions = suggestSeats(availableSeats, ticketCount)
      setSuggestedSeats(suggestions)

      // Actualizar el estado de los asientos para mostrar sugerencias
      setSeats(
        availableSeats.map((seat) => ({
          ...seat,
          status: suggestions.has(seat.id) ? ("suggested" as SeatStatus) : seat.status,
        })),
      )
    }
  }, [ticketCount]) // Eliminamos 'seats' de las dependencias

  // Handle seat selection
  const handleSeatClick = (seatId: string) => {
    const updatedSeats = seats.map((seat) => {
      if (seat.id === seatId) {
        if (seat.status === "available" || seat.status === "suggested") {
          // Only allow selecting if under the ticket count limit
          if (selectedSeats.length < ticketCount) {
            setSelectedSeats((prev) => [...prev, seatId])
            // Explicitly cast status to SeatStatus
            return { ...seat, status: "selected" as SeatStatus }
          } else {
            // Limit reached, do not change the status (or maybe show a message)
            console.warn("Cannot select more seats than the number of tickets.")
            return seat // Return the seat unchanged
          }
        } else if (seat.status === "selected") {
          // Allow deselecting anytime
          setSelectedSeats((prev) => prev.filter((id) => id !== seatId))
          // Explicitly cast status to SeatStatus
          return { ...seat, status: "available" as SeatStatus } // Return to available status
        }
      }
      return seat
    })

    // Only update state if a change actually occurred
    // This prevents unnecessary re-renders if the user clicks a seat when the limit is reached
    if (JSON.stringify(seats) !== JSON.stringify(updatedSeats)) {
      setSeats(updatedSeats)
    }
  }

  // Handle ticket count change
  const handleTicketCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Number.parseInt(e.target.value) || 1
    setTicketCount(Math.max(1, Math.min(count, 10))) // Limit between 1-10 tickets

    // If reducing ticket count, deselect excess seats
    if (count < selectedSeats.length) {
      const seatsToKeep = selectedSeats.slice(0, count)
      const seatsToDeselect = selectedSeats.slice(count)

      setSelectedSeats(seatsToKeep)

      setSeats((prev) =>
        prev.map((seat) =>
          seatsToDeselect.includes(seat.id) && seat.status === "selected" ? { ...seat, status: "available" as SeatStatus } : seat,
        ),
      )
    }
  }

  // Seleccionar todos los asientos sugeridos
  const handleSelectSuggested = () => {
    if (suggestedSeats.size === 0) return

    // Limpiar selecciones anteriores
    setSelectedSeats([...suggestedSeats])

    // Actualizar estado de asientos
    setSeats((prev) =>
      prev.map((seat) => ({
        ...seat,
        status: suggestedSeats.has(seat.id) ? "selected" as SeatStatus : seat.status === "selected" ? "available" as SeatStatus : seat.status,
      })),
    )
  }

  // Group seats by row for display
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.row]) {
        acc[seat.row] = []
      }
      acc[seat.row].push(seat)
      return acc
    },
    {} as Record<string, Seat[]>,
  )

  return (
    <div className="min-h-screen bg-[#1E1E2F] text-white font-[Inter]">
      {/* Header */}
      <header className="relative h-48 md:h-64 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=2071&auto=format&fit=crop"
          alt="Teatro UNA"
          fill
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col p-6 bg-black/30">
          <h1 className="text-3xl md:text-4xl font-bold font-[Poppins] text-center">TEATRO-UNA</h1>
          <p className="text-sm md:text-base text-center mt-2 max-w-md">
            Selecciona tus asientos para una experiencia inolvidable
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Seat Selection */}
          <div className="lg:col-span-2">
            <Card className="bg-[#252538] border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-[Poppins] text-xl">Selección de Asientos</CardTitle>
                <CardDescription>Haz clic en los asientos disponibles para seleccionarlos</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Screen */}
                <div className="relative mb-10 mt-2">
                  <div className="h-10 bg-gradient-to-b from-white/30 to-transparent rounded-t-full mx-auto w-4/5 flex items-center justify-center">
                    <span className="text-xs text-white/70 font-semibold">ESCENARIO</span>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-2">PANTALLA</p>
                </div>

                {/* Seat Grid */}
                <div className="flex flex-col items-center gap-3 overflow-x-auto pb-4">
                  {Object.keys(seatsByRow)
                    .sort()
                    .map((row) => (
                      <div key={row} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-6 text-center">{row}</span>
                        <div className="flex gap-1.5">
                          {seatsByRow[row].map((seat) => (
                            <button
                              key={seat.id}
                              onClick={() => seat.status !== "occupied" && handleSeatClick(seat.id)}
                              disabled={seat.status === "occupied"}
                              aria-label={`Asiento ${seat.row}${seat.number}, ${seat.status === "available"
                                ? "disponible"
                                : seat.status === "occupied"
                                  ? "ocupado"
                                  : seat.status === "suggested"
                                    ? "sugerido"
                                    : "seleccionado"
                                }`}
                              className={cn(
                                "w-7 h-7 md:w-8 md:h-8 rounded-t-lg flex items-center justify-center text-xs transition-all duration-200",
                                seat.status === "available" &&
                                "bg-[#4CAF50] hover:bg-[#4CAF50]/80 focus:ring-2 focus:ring-[#4CAF50]/50",
                                seat.status === "occupied" && "bg-[#E91E63] cursor-not-allowed opacity-70",
                                seat.status === "selected" &&
                                "bg-[#FFC107] hover:bg-[#FFC107]/80 focus:ring-2 focus:ring-[#FFC107]/50",
                                seat.status === "suggested" &&
                                "bg-[#2196F3] hover:bg-[#2196F3]/80 focus:ring-2 focus:ring-[#2196F3]/50 animate-pulse",
                              )}
                            >
                              {seat.status === "selected" && <Check className="w-3 h-3" />}
                              {seat.status === "occupied" && <X className="w-3 h-3" />}
                              {(seat.status === "available" || seat.status === "suggested") && seat.number}
                            </button>
                          ))}
                        </div>
                        <span className="text-sm font-medium w-6 text-center">{row}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
              <CardFooter className="flex-col items-start gap-4">
                <div className="flex items-center justify-center gap-4 w-full flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#4CAF50]" variant="default">
                      <span className="sr-only">Disponible</span>
                    </Badge>
                    <span className="text-sm">Disponible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#E91E63]" variant="default">
                      <span className="sr-only">Ocupado</span>
                    </Badge>
                    <span className="text-sm">Ocupado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#FFC107]" variant="default">
                      <span className="sr-only">Seleccionado</span>
                    </Badge>
                    <span className="text-sm">Seleccionado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#2196F3]" variant="default">
                      <span className="sr-only">Sugerido</span>
                    </Badge>
                    <span className="text-sm">Sugerido</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Ticket Info */}
          <div>
            <Card className="bg-[#252538] border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-[Poppins] text-xl">Resumen de Compra</CardTitle>
                <CardDescription>Información de tus boletos seleccionados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketCount">Número de boletos</Label>
                  <Input
                    id="ticketCount"
                    type="number"
                    min="1"
                    max="10"
                    value={ticketCount}
                    onChange={handleTicketCountChange}
                    className="bg-[#1E1E2F] border-[#3E3E5E]"
                  />
                  {suggestedSeats.size > 0 && (
                    <Button
                      onClick={handleSelectSuggested}
                      variant="outline"
                      className="w-full mt-2 border-[#2196F3] text-[#2196F3] hover:bg-[#2196F3]/10"
                    >
                      Usar asientos sugeridos
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Asientos seleccionados</Label>
                  <div className="min-h-20 p-3 rounded-md bg-[#1E1E2F] border border-[#3E3E5E]">
                    {selectedSeats.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSeats.map((seatId) => (
                          <Badge key={seatId} className="bg-[#FFC107] text-black">
                            {seatId}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No has seleccionado asientos</p>
                    )}
                  </div>
                </div>

                <Separator className="bg-[#3E3E5E]" />

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Precio por boleto</span>
                    <span className="font-medium">{formatCurrency(THEATER_CONFIG.ticketPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cargo por servicio</span>
                    <span className="font-medium">{formatCurrency(THEATER_CONFIG.serviceFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(selectedSeats.length * (THEATER_CONFIG.ticketPrice + THEATER_CONFIG.serviceFee))}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-[#4CAF50] hover:bg-[#4CAF50]/90 text-white"
                  disabled={selectedSeats.length === 0}
                >
                  Confirmar reserva
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-[#252538] border-none shadow-lg mt-4">
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  <CardTitle className="font-[Poppins] text-sm">Información de la función</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Película:</span>
                  <span className="font-medium">El Gran Estreno</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="font-medium">15 de Abril, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora:</span>
                  <span className="font-medium">19:30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sala:</span>
                  <span className="font-medium">Sala 3</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-[#191927] mt-12 py-8 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="font-[Poppins] font-semibold text-lg mb-3">TEATRO-UNA</h3>
              <p className="text-sm text-muted-foreground">
                El mejor lugar para disfrutar de las artes escénicas y cinematográficas.
              </p>
            </div>
            <div>
              <h3 className="font-[Poppins] font-semibold text-lg mb-3">Contacto</h3>
              <address className="not-italic text-sm text-muted-foreground">
                <p>Av. Principal #123</p>
                <p>Ciudad Universitaria</p>
                <p>Tel: (123) 456-7890</p>
                <p>Email: info@teatro-una.com</p>
              </address>
            </div>
            <div>
              <h3 className="font-[Poppins] font-semibold text-lg mb-3">Horarios</h3>
              <p className="text-sm text-muted-foreground">
                Lunes a Viernes: 10:00 - 22:00
                <br />
                Sábados y Domingos: 12:00 - 00:00
              </p>
            </div>
            <div>
              <h3 className="font-[Poppins] font-semibold text-lg mb-3">Síguenos</h3>
              <div className="flex gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z" />
                  </svg>
                  <span className="sr-only">Facebook</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
                  </svg>
                  <span className="sr-only">Instagram</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
                  </svg>
                  <span className="sr-only">Twitter</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[#3E3E5E] text-center">
            <p className="text-xs text-muted-foreground">© 2025 TEATRO-UNA. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
