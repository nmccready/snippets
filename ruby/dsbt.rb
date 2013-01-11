#dsbt - debug sbt
#script is meant to run a local copy of ./sbt and provides debugging options to java
#this is meant to replace environment variable as ports tend to collide on debugging

#test -f ~/.sbtconfig && . ~/.sbtconfig
#exec java -Xmx512M -XX:MaxPermSize=1G ${SBT_OPTS} -jar ./sbt-launch.jar "$@"
portToCheck = ARGV[0]

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