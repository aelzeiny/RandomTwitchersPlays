# Random Twitchers Play Random Games From my Nintendo Switch

The goal is to build a low-latency webclient to play nintendo switch games from anywhere in the world.
Here's what I've pieced together so far:
* 150ms of latency is considered too much latency
* [DekuNukem's JoyAnalog repo](https://github.com/dekuNukem/joyAnalog) has a schematic for a PCB board that can send inputs to a Nintendo Switch Joycon Controller. I've barely managed to generate a Gerber file and Bill of Materials. Now I have to brush off some rusty soldering skills.
* There are very few low-latency HDMI capture devices out there. The [Magewell USB Capture Device](https://www.amazon.com/d/B00I16VQOY) utilizes USB 3.0 webcam drivers to transmit data real-time without the installation of anything proprietry. [This table](http://www.magewell.com/blog/4/detail) allows us to optimize for the best resolution without sacrificing latency
* Magewell also has a [developer's SDK](http://www.magewell.com/sdk) in C++ with some very promising documentation. However, the webcam drivers makes it highly compatible with most libraries (i.e: openCV)
* I tried my hand at El-Gato HD60S capture device and experienced notably higher latency. The device requires special drivers that only work on Windows, and the [ElGato SDK](https://github.com/elgatosf/gamecapture) is much less documented.
* Happauge's PCIe board has upward of 5 seconds of delay; making any game unplayable
* WebRTC is the best candidate for low-latency communication due to its common usage in private video chat rooms.
