import tensorflow as tf
import keras
from keras import layers

# Define Sequential model with 3 layers
model = keras.Sequential()
# model.add(keras.Input(shape=(3,)))
model.add(layers.Dense(2, activation="relu", input_shape=(3,)))
model.add(layers.Dense(3, activation="sigmoid"))
model.add(layers.Dense(4, activation="sigmoid"))
model.add(layers.Dense(4, activation="sigmoid"))
model.add(layers.Dense(4, activation="sigmoid"))
model.add(layers.Dense(4, activation="sigmoid"))


x = tf.ones((3, 3))
y = model(x)

model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
model.fit(x,y,epochs=10000)

print(model.predict(x))

print(model.summary())