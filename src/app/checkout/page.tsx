"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function CheckoutPage() {
  const { items, totalPrice, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cream-dark flex items-center justify-center">
            <svg className="w-10 h-10 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-espresso mb-3">Your Cart is Empty</h1>
          <p className="text-muted mb-8">Add some delicious items from our menu to get started.</p>
          <Link
            href="/menu"
            className="inline-flex items-center px-8 py-3.5 text-sm tracking-widest text-cream bg-espresso rounded-full hover:bg-brown transition-colors uppercase font-medium"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  const tax = totalPrice * 0.0925;
  const total = totalPrice + tax;

  return (
    <div className="pt-20">
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Link href="/menu" className="inline-flex items-center gap-2 text-sm text-muted hover:text-gold transition-colors mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Menu
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl text-espresso">Checkout</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Order summary */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-medium tracking-wider uppercase text-muted mb-4">Your Order</h2>
              {items.map(({ item, quantity }) => (
                <div key={item.id} className="flex gap-4 bg-card rounded-xl p-5 border border-border">
                  <div className={`w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    item.category === "cannoli" ? "bg-amber-50" : item.category === "gelato" ? "bg-pink-50" : item.category === "kits" ? "bg-teal-50" : "bg-rose-50"
                  }`}>
                    <svg className="w-8 h-8 text-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-serif text-lg text-espresso">{item.name}</h3>
                        <p className="text-sm text-muted mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-gold font-medium ml-4">${(item.price * quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:border-gold hover:text-gold transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M5 12h14" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-espresso w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, quantity + 1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:border-gold hover:text-gold transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-sm text-muted hover:text-terracotta transition-colors underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                {/* Pickup Info */}
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h2 className="text-sm font-medium tracking-wider uppercase text-muted mb-4">Pickup Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-brown mb-1.5">Full Name</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brown mb-1.5">Phone</label>
                      <input
                        type="tel"
                        placeholder="(650) 000-0000"
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brown mb-1.5">Email</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brown mb-1.5">Pickup Time</label>
                      <select className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors text-espresso">
                        <option>Select a time</option>
                        <option>11:00 AM</option>
                        <option>11:30 AM</option>
                        <option>12:00 PM</option>
                        <option>12:30 PM</option>
                        <option>1:00 PM</option>
                        <option>1:30 PM</option>
                        <option>2:00 PM</option>
                        <option>2:30 PM</option>
                        <option>3:00 PM</option>
                        <option>3:30 PM</option>
                        <option>4:00 PM</option>
                        <option>4:30 PM</option>
                        <option>5:00 PM</option>
                        <option>5:30 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-brown mb-1.5">Special Instructions</label>
                      <textarea
                        placeholder="Any special requests..."
                        rows={3}
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h2 className="text-sm font-medium tracking-wider uppercase text-muted mb-4">Payment</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-brown mb-1.5">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-brown mb-1.5">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-brown mb-1.5">CVC</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Total */}
                <div className="bg-card rounded-xl p-6 border border-border">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-brown">
                      <span>Subtotal</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-brown">
                      <span>Tax (9.25%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-medium text-espresso">Total</span>
                      <span className="font-serif text-xl text-espresso">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full flex items-center justify-center px-6 py-4 text-sm tracking-widest text-cream bg-espresso rounded-full hover:bg-brown transition-colors uppercase font-medium">
                  Place Order
                </button>

                <p className="text-xs text-center text-muted">
                  This is a demo checkout. No real orders will be placed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
