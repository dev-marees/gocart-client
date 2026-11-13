'use client'
import { Suspense } from "react";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GoogleOAuthCallback from "@/components/GoogleOAuthCallback";

export default function PublicLayout({ children }) {
    return (
        <>
            <Suspense fallback={null}>
                <GoogleOAuthCallback />
            </Suspense>
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
