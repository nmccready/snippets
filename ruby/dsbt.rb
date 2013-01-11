portToCheck = ARGV[0]

# require "open3"

if portToCheck == nil
	print "What is th debug port? "
	portToCheck = gets.chomp
end
sbtLines = IO.readlines("./sbt")
sbtOpts = "${SBT_OPTS}"

replaced = sbtLines.each { |line| 
	# if line["\n"]
	# 	line["\n"] = " "
	if line["exec"]
		line["exec"] = ""
	end
	if line[sbtOpts] 
		line[sbtOpts] = "-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=" + portToCheck
	end
}
replaced = replaced.join(" ")
exec(replaced)