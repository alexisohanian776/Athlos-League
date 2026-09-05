import './globals.css';

export const metadata = {
  title: 'ATHLOS League',
  description: 'The fastest women on Earth. One night in London.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
