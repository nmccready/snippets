package tl

import sbt._
import Keys._
import CommandSupport.{ClearOnFailure, FailureWall}
import complete.Parser
import Parser._
import Cache.seqFormat
import sbinary.DefaultProtocol.StringFormat
import java.io._
import scala.collection.JavaConverters._
import java.lang.{ProcessBuilder => JProcessBuilder}
import java.net.URLClassLoader

object Colors {

  import scala.Console._

  lazy val isANSISupported = {
    Option(System.getProperty("sbt.log.noformat")).map(_ != "true").orElse {
      Option(System.getProperty("os.name"))
        .map(_.toLowerCase)
        .filter(_.contains("windows"))
        .map(_ => false)
    }.getOrElse(true)
  }

  def red(str: String): String = if (isANSISupported) (RED + str + RESET) else str

  def blue(str: String): String = if (isANSISupported) (BLUE + str + RESET) else str

  def cyan(str: String): String = if (isANSISupported) (CYAN + str + RESET) else str

  def green(str: String): String = if (isANSISupported) (GREEN + str + RESET) else str

  def magenta(str: String): String = if (isANSISupported) (MAGENTA + str + RESET) else str

  def white(str: String): String = if (isANSISupported) (WHITE + str + RESET) else str

  def black(str: String): String = if (isANSISupported) (BLACK + str + RESET) else str

  def yellow(str: String): String = if (isANSISupported) (YELLOW + str + RESET) else str

}

object Commands {

  private val consoleReader = new jline.ConsoleReader

  private def waitForKey() = {
    consoleReader.getTerminal.disableEcho()
    def waitEOF() {
      consoleReader.readVirtualKey() match {
        case 4 => // STOP
        case 11 => consoleReader.clearScreen(); waitEOF()
        case 10 => println(); waitEOF()
        case _ => waitEOF()
      }

    }
    waitEOF()
    consoleReader.getTerminal.enableEcho()
  }

  val startCommand = Command.args("start", "<args>") {
    (state: State, args: Seq[String]) =>
      val extracted = Project.extract(state)

      Project.runTask(compile in Compile, state).get._2.toEither match {
        case Left(_) => {
          println()
          println("Cannot start with errors.")
          println()
          state.fail
        }
        case Right(_) => {

          Project.runTask(dependencyClasspath in Runtime, state).get._2.toEither.right.map {
            dependencies =>

              val classpath = dependencies.map(_.data).map(_.getCanonicalPath).reduceLeft(_ + java.io.File.pathSeparator + _)

              import java.lang.{ProcessBuilder => JProcessBuilder}
              val builder = new JProcessBuilder(Seq(
                "java") ++ (System.getProperties.asScala).map {
                case (key, value) => "-D" + key + "=" + value
              } ++ Seq("-cp", classpath, "coreevents2.Runner", extracted.currentProject.base.getCanonicalPath): _*)

              new Thread {
                override def run {
                  System.exit(Process(builder) !)
                }
              }.start()

              println(Colors.green(
                """|
                  |(Starting application. Type Ctrl+D to exit logs, the application will remain in background)
                  | """.stripMargin))

              waitForKey()

              println()

              state.copy(remainingCommands = Seq.empty)

          }.right.getOrElse {
            println()
            println("Oops, cannot start the application?")
            println()
            state.fail
          }

        }
      }

  }

  private def filterArgs(args: Seq[String]): Seq[(String, String)] = {
    val (properties, others) = args.span(_.startsWith("-D"))
    // collect arguments plus config file property if present
    val javaProperties = properties.map(_.drop(2).split('=')).map(a => a(0) -> a(1)).toSeq
    javaProperties
  }

  val runCommand = Command.args("run", "<args>") {
    (state: State, args: Seq[String]) =>

      val extracted = Project.extract(state)

      // Parse HTTP port argument
      val properties = filterArgs(args)

      // Set Java properties
      properties.foreach {
        case (key, value) => System.setProperty(key, value)
      }

      println()

      val sbtLoader = this.getClass.getClassLoader
      val maybeNewState = Project.runTask(dependencyClasspath in Compile, state).get._2.toEither.right.map {
        dependencies =>

        // All jar dependencies. They will not been reloaded and must be part of this top classloader
          val classpath = dependencies.map(_.data.toURI.toURL).filter(_.toString.endsWith(".jar")).toArray

          classpath.foreach(println(_))

          lazy val applicationLoader: ClassLoader = new URLClassLoader(classpath)

          val mainClass = applicationLoader.loadClass("coreevents2.Runner")
          val mainDev = mainClass.getMethod("mainDev")

          // Run in DEV
          val server = mainDev.invoke(null)

          println()
          println(Colors.green("(Server started, use Ctrl+D to stop and go back to the console...)"))
          println()
      }
      state.exit(true)
  }
}