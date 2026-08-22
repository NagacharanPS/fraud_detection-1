import PaymentForm from "../components/PaymentForm";

function Home() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "30px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
        }}
      >
        <PaymentForm />
      </div>
    </div>
  );
}

export default Home;
