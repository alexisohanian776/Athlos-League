/* ATHLOS wordmark. Light contexts use the mark as-is; dark contexts invert it. */
export default function Wordmark({ size = 22, light = false, style }) {
  return (
    <img
      src="/assets/athlos-wordmark.png"
      alt="ATHLOS"
      style={{
        height: size * 0.82,
        width: 'auto',
        display: 'block',
        filter: light ? 'brightness(0) invert(1)' : 'none',
        ...style,
      }}
    />
  );
}
