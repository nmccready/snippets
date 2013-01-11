package controllers

import scala.concurrent._
import play.api.libs.iteratee._
import play.api.mvc._
import play.api.http.{Status, HeaderNames}
import reactivemongo.api.gridfs.ReadFileEntry

trait IStreamController extends HeaderNames with Status {
  def serve(optEntry: Future[Option[ReadFileEntry]], errorMsg: String)(implicit ec: ExecutionContext): Future[Result] = {
    optEntry.filter(_.isDefined).map(_.get).map {
      file =>
        SimpleResult(
          header = ResponseHeader(OK, Map(
            CONTENT_LENGTH -> ("" + file.length),
            CONTENT_TYPE -> file.contentType.getOrElse("application/octet-stream")
          )),
          body = file.enumerate
        )
    }.recover {
      case _ =>
        val bytes = (errorMsg).toCharArray.map(_.toByte)
        SimpleResult(
          header = ResponseHeader(NOT_FOUND, Map(CONTENT_LENGTH -> bytes.length.toString)),
          body = Enumerator.apply(bytes)
        )
    }
  }
}


