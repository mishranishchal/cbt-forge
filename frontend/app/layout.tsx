import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBT Forge",
  description: "Turn question papers into realistic computer-based tests."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=JSON.parse(localStorage.getItem('cbt-forge-settings')||'{}');var t=s.theme||'light';if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){}"
          }}
        />
        {children}
      </body>
    </html>
  );
}




// import type { Metadata } from "next";
// import "./globals.css";

// export const metadata: Metadata = {
//   title: "CBT Forge",
//   description: "Turn question papers into realistic computer-based tests."
// };

// export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
//   return (
//     <html lang="en">
//       <body>
//         <script
//           dangerouslySetInnerHTML={{
//             __html:
//               "try{var s=JSON.parse(localStorage.getItem('cbt-forge-settings')||'{}');var t=s.theme||'light';if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){}"
//           }}
//         />
//         {children}
//       </body>
//     </html>
//   );
// }
