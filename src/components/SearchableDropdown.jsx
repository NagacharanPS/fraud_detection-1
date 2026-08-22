import { useEffect, useRef } from "react";

function SearchableDropdown({
    label,
    value,
    onChange,
    results,
    onSelect,
    placeholder,
    visible,
    setVisible,
    loading = false
}) {

    const wrapperRef = useRef(null);

    useEffect(() => {

        function handleClickOutside(event) {

            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target)
            ) {
                setVisible(false);
            }

        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

    }, [setVisible]);

    return (

        <div
            ref={wrapperRef}
            style={{
                marginBottom: "22px",
                position: "relative"
            }}
        >

            <label
                style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    color: "#374151"
                }}
            >
                {label}
            </label>

            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onFocus={() => setVisible(true)}
                onChange={(e) => {
                    onChange(e.target.value);
                    setVisible(true);
                }}
                style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid #D1D5DB",
                    outline: "none",
                    fontSize: "15px",
                    boxSizing: "border-box"
                }}
            />

            {visible && (

                <div
                    style={{
                        position: "absolute",
                        width: "100%",
                        background: "#ffffff",
                        border: "1px solid #E5E7EB",
                        borderRadius: "12px",
                        marginTop: "6px",
                        maxHeight: "240px",
                        overflowY: "auto",
                        boxShadow:
                            "0 10px 25px rgba(0,0,0,0.08)",
                        zIndex: 100
                    }}
                >

                    {loading ? (

                        <div
                            style={{
                                padding: "16px",
                                textAlign: "center"
                            }}
                        >
                            Loading...
                        </div>

                    ) : results.length === 0 ? (

                        <div
                            style={{
                                padding: "16px",
                                textAlign: "center",
                                color: "#6B7280"
                            }}
                        >
                            No Accounts Found
                        </div>

                    ) : (

                        results.map((account) => (

                            <div
                                key={account.account_id}
                                onClick={() => {
                                    onSelect(account);
                                    setVisible(false);
                                }}
                                style={{
                                    padding: "14px",
                                    cursor: "pointer",
                                    borderBottom:
                                        "1px solid #F3F4F6"
                                }}
                            >

                                <div
                                    style={{
                                        fontWeight: 600
                                    }}
                                >
                                    {account.account_id}
                                </div>

                                <div
                                    style={{
                                        fontSize: "13px",
                                        color: "#6B7280"
                                    }}
                                >
                                    {account.account_name}
                                </div>

                                <div
                                    style={{
                                        fontSize: "12px",
                                        color: "#9CA3AF"
                                    }}
                                >
                                    {account.upi_id}
                                </div>

                            </div>

                        ))

                    )}

                </div>

            )}

        </div>

    );

}

export default SearchableDropdown;
