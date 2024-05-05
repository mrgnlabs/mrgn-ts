export const Contact = () => {
  return (
    <div className="container flex items-center gap-20 py-24">
      <video autoPlay muted>
        <source src="/videos/contact.mp4" type="video/mp4" />
      </video>
      <div>
        <h2 className="text-4xl font-medium">
          Are you building something?
          <br className="hidden lg:block" />
          Let&apos;s talk
        </h2>
      </div>
    </div>
  );
};
