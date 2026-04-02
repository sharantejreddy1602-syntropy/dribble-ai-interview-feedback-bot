import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

df = pd.read_csv("../data/training_data.csv")

X = df[
    ["word_count", "total_fillers", "unique_word_ratio",
     "avg_word_length", "sentence_count",
     "duration_sec", "speaking_rate_wps", "latency_sec"]
]

y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

pred = model.predict(X_test)

acc = accuracy_score(y_test, pred)

print("\n✅ Training completed on CPU")
print("Accuracy:", round(acc * 100, 2), "%")

print("\nClassification Report:\n")
print(classification_report(y_test, pred))

joblib.dump(model, "../data/fluency_model.pkl")

print("\n✅ Model saved as fluency_model.pkl")
