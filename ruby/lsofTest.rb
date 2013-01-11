portToCheck = ARGV[0]
if portToCheck == nil
	print "What is the port? "
	portToCheck = gets.chomp
end
file = IO.popen("lsof -i:"+ portToCheck)
lines = file.readlines
puts lines.size